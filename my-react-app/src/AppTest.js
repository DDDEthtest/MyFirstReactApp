import React, { useState } from 'react';
import './App.css';

function AppTest() {
  // Track visibility of each layer in state
  const [visible, setVisible] = useState({
    background: true,
    lower: true,
    upper: true,
    face: true,
    eyes: true,
    hat: true,
  });

  // Toggle function
  const toggleLayer = (layer) => {
    setVisible((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <>
      <div className="svg-container">
        {visible.background && (
          <img src="/img/background.png" alt="SVG 1" className="svg-layer" />
        )}
        {visible.lower && (
          <img src="/img/lower.png" alt="SVG 3" className="svg-layer" />
        )}
        {visible.upper && (
          <img src="/img/upper.png" alt="SVG 4" className="svg-layer" />
        )}
        {visible.face && (
          <img src="/img/face.png" alt="SVG 5" className="svg-layer" />
        )}
        {visible.eyes && (
          <img src="/img/eyes.png" alt="SVG 6" className="svg-layer" />
        )}
        {visible.hat && (
          <img src="/img/hat.png" alt="SVG 2" className="svg-layer" />
        )}
      </div>

      {/* Controls */}
      <a href="#" onClick={() => toggleLayer('background')}>background</a> <br />
      <a href="#" onClick={() => toggleLayer('lower')}>lower</a> <br />
      <a href="#" onClick={() => toggleLayer('upper')}>upper</a> <br />
      <a href="#" onClick={() => toggleLayer('face')}>face</a> <br />
      <a href="#" onClick={() => toggleLayer('eyes')}>eyes</a> <br />
      <a href="#" onClick={() => toggleLayer('hat')}>hat</a>
    </>
  );
}

export default AppTest;

