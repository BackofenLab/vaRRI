import { viewerComponent } from './context.js';

export default viewerComponent('site-header', `<header>
  <a class="group-logo-link" href="https://www.bioinf.uni-freiburg.de" target="_blank" rel="noopener noreferrer" aria-label="Visit the Bioinformatics Group Freiburg website">
    <img class="group-logo" src="https://www.bioinf.uni-freiburg.de/assets/images/bioinf-fr-logo-blau.png" alt="Bioinformatics Group Freiburg logo">
  </a>
  <img class="varri-logo" src="logo/vaRRI.logo.200x200.png" alt="vaRRI logo">
  <div class="header-title">
    <h1>vaRRI</h1>
    <p>Visual Annotation of RNA–RNA Interactions</p>
  </div>
  <div class="uni-logo-wrap">
    <a class="uni-logo-link" href="https://www.bioinf.uni-freiburg.de" target="_blank" rel="noopener noreferrer" aria-label="Open the University Freiburg Bioinformatics website in a new tab">
      <span class="uni-logo-text">Bioinformatics -</span>
      <img src="https://www.bioinf.uni-freiburg.de/assets/images/logo-uni-freiburg.png" alt="University Freiburg logo" class="uni-logo">
    </a>
  </div>
</header>`);
