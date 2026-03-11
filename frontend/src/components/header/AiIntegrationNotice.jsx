import React from 'react';
import { FEATURE_FLAGS } from '../../config';

const AiIntegrationNotice = () => {
  if (!FEATURE_FLAGS.SHOW_AI_RESEARCH_UI) {
    return null;
  }

  return (
    <div className='ai-integration-notice'>
      <span className='notice-label'>NOTICE:</span>
      <span> There's now an AI integration. Press the </span>
      <span className='ai-icon-example'>🤖</span>
      <span> icon to attempt to get info about the bands</span>
    </div>
  );
};

export default AiIntegrationNotice;
