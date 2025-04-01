#!/bin/bash

# Script for converting HTML files from intake to scripts folder
# with teleprompter-specific styles

# Define directories
INTAKE_DIR="./intake"
SCRIPTS_DIR="./scripts"

# Create directories if they don't exist
mkdir -p "$INTAKE_DIR"
mkdir -p "$SCRIPTS_DIR"

# Define the custom CSS
CUSTOM_CSS='
/* Base styles for teleprompter */
body, html {
  background-color: black !important;
  margin: 0 !important;
  padding: 0 !important;
  color: white !important;
  font-family: "Courier New", monospace !important;
}

/* Character names */
p[style*="padding-left: 166pt"], 
p[style*="padding-left: 165pt"], 
p[style*="padding-left: 178pt"],
p[style*="padding-left: 142pt"],
p[style*="padding-left: 40pt"],
p[style*="padding-left: 84pt"],
p[style*="padding-left: 65pt"],
p[style*="padding-left: 77pt"],
p[style*="padding-left: 91pt"],
p[style*="padding-left: 104pt"],
p[style*="padding-left: 83pt"] {
  color: #FFD700 !important; /* Gold color for character names */
  font-weight: bold !important;
  margin-bottom: 0 !important;
  text-align: center !important;
}

/* Dialog text */
p[style*="padding-left: 94pt"],
p[style*="padding-left: 93pt"] {
  color: white !important;
  margin-top: 0 !important;
  margin-bottom: 1em !important;
  text-align: center !important;
}

/* Parentheticals in dialog */
p[style*="padding-left: 123pt"],
p[style*="padding-left: 129pt"],
p[style*="padding-left: 121pt"],
p[style*="padding-left: 122pt"],
p[style*="padding-left: 144pt"],
p[style*="padding-left: 157pt"],
p[style*="padding-left: 136pt"],
p[style*="padding-left: 150pt"],
p[style*="padding-left: 142pt"] {
  color: #BBBBBB !important; /* Light gray for parentheticals */
  font-style: italic !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  text-align: center !important;
}

/* Scene headings */
p[style*="padding-left: 22pt"] {
  color: #ADD8E6 !important; /* Light blue for scene headings */
  font-weight: bold !important;
  margin-top: 1.5em !important;
  margin-bottom: 0.5em !important;
  text-align: center !important;
}

/* Transitions */
p[style*="text-align: right"] {
  color: #FFA07A !important; /* Light salmon for transitions */
  font-weight: bold !important;
  text-transform: uppercase !important;
  margin-top: 1em !important;
  margin-bottom: 1em !important;
  text-align: center !important;
}

/* General paragraph and text styling */
p, .p {
  line-height: 1.5 !important;
  margin-bottom: 0.5em !important;
  color: white !important;
}

/* Empty paragraphs and line breaks */
p:empty, br {
  display: block;
  height: 1em;
}

/* Text styling */
b, strong {
  font-weight: bold !important;
}

i, em {
  font-style: italic !important;
}

u {
  text-decoration: underline !important;
}
'

# Function to process HTML files
process_file() {
  local source_file="$1"
  local dest_file="$2"
  
  echo "Processing: $source_file -> $dest_file"
  
  # Read the file
  content=$(cat "$source_file")
  
  # Create a temporary file
  temp_file=$(mktemp)
  
  # Check if there's a style tag
  if grep -q "</style>" "$source_file"; then
    # Add styles to existing style tag
    sed "s|</style>|$CUSTOM_CSS\n</style>|" "$source_file" > "$temp_file"
  elif grep -q "</head>" "$source_file"; then
    # Add style tag
    sed "s|</head>|<style type=\"text/css\">$CUSTOM_CSS</style>\n</head>|" "$source_file" > "$temp_file"
  else
    # No head tag, add both
    sed "s|<html|<html>\n<head><style type=\"text/css\">$CUSTOM_CSS</style></head>|" "$source_file" > "$temp_file"
  fi
  
  # Add body style attribute
  if grep -q "<body" "$temp_file"; then
    sed -i "s|<body\([^>]*\)>|<body\\1 style=\"background-color: black !important; color: white !important;\">|" "$temp_file"
  fi
  
  # Copy to destination
  cp "$temp_file" "$dest_file"
  
  # Remove temp file
  rm "$temp_file"
  
  echo "Successfully processed: $(basename "$source_file")"
}

# Main function
process_new_files() {
  echo "Scanning for new files to process..."
  
  # Check for HTML files in intake directory
  html_files=$(find "$INTAKE_DIR" -name "*.html" -type f)
  
  if [ -z "$html_files" ]; then
    echo "No HTML files found in the intake directory."
    return
  fi
  
  processed_count=0
  
  # Process each file
  while IFS= read -r file; do
    # Get the base filename
    base_name=$(basename "$file")
    dest_file="$SCRIPTS_DIR/$base_name"
    
    # Check if file already exists in scripts directory
    if [ ! -f "$dest_file" ]; then
      process_file "$file" "$dest_file"
      ((processed_count++))
    else
      echo "Skipping $base_name - already exists in scripts directory"
    fi
  done <<< "$html_files"
  
  echo "Processed $processed_count new file(s)"
}

# Print script header
echo "Script Converter Tool (Bash Version)"
echo "==================================="
echo "Intake directory: $INTAKE_DIR"
echo "Scripts directory: $SCRIPTS_DIR"
echo "--------------------"

# Run the process
process_new_files