'use client'

import { useEffect } from 'react'
import { Model } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.css'
import { json } from '../../data/survey_json.js'
import { setSurveyJSLicense } from '../lib/surveyjs-config'
  
export default function SurveyComponent() {
  useEffect(() => {
    // Set SurveyJS license on component mount
    setSurveyJSLicense();
  }, []);

  const model = new Model(json);
  return (
    <Survey model={model}/>
  );
}
