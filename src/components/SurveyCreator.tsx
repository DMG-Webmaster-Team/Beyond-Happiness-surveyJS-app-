'use client'

import { useState, useEffect } from "react";
import { ICreatorOptions } from "survey-creator-core";
import dynamic from "next/dynamic";
import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

import { json as defaultJson } from "../../data/survey_json";

// Dynamically import SurveyCreatorComponent to avoid SSR issues
const DynamicSurveyCreatorComponent = dynamic(
  () => import("survey-creator-react").then((mod) => mod.SurveyCreatorComponent),
  {
    ssr: false,
    loading: () => <div className="text-center py-8">Loading survey creator...</div>,
  }
);

const defaultCreatorOptions: ICreatorOptions = {
  showTranslationTab: true
};

export default function SurveyCreatorWidget(props: { json?: Object, options?: ICreatorOptions }) {
  const [creator, setCreator] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const initCreator = async () => {
      try {
        const { SurveyCreator } = await import("survey-creator-react");
        
        const newCreator = new SurveyCreator(props.options || defaultCreatorOptions);
        newCreator.saveSurveyFunc = (no: number, callback: (num: number, status: boolean) => void) => {
          console.log(JSON.stringify(newCreator?.JSON));
          callback(no, true);
        };
        
        newCreator.JSON = props.json || defaultJson;
        setCreator(newCreator);
      } catch (error) {
        console.error("Error initializing survey creator:", error);
      }
    };

    initCreator();
  }, [mounted, props.json, props.options]);

  if (!mounted || !creator) {
    return (
      <div className="text-center py-8">
        <div>Loading survey creator...</div>
      </div>
    );
  }

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <DynamicSurveyCreatorComponent creator={creator} />
    </div>
  );
}
