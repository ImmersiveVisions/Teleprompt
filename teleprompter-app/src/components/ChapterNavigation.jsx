// src/components/ChapterNavigation.jsx
import React from 'react';
import { sendControlMessage } from '../services/websocket';
import '../styles.css';

const ChapterNavigation = ({ chapters, currentChapter }) => {
  const jumpToChapter = (chapterIndex) => {
    if (chapters[chapterIndex]) {
      sendControlMessage('JUMP_TO_CHAPTER', chapterIndex);
    }
  };

  return (
    <div className="chapter-navigation">
      <h3>Chapters</h3>
      <div className="chapters-list">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id}
            className={`chapter-btn ${currentChapter === index ? 'active' : ''}`}
            onClick={() => jumpToChapter(index)}
          >
            {chapter.title.includes('FILM CLIP') 
              ? `FILM CLIP ${index + 1}` 
              : chapter.title}
          </button>
        ))}
        
        {chapters.length === 0 && (
          <div className="no-chapters-message">
            No chapters found in this script.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterNavigation;