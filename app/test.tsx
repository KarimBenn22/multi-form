"use client";

import { useMultiStepForm } from "./store";

export default function TestForm() {
  const { state, nextStep, previousStep } = useMultiStepForm();
  return (
    <>
      <div className="text-xl">{state.currentStep}</div>
      <div className="flex gap-4">
        <button onClick={nextStep} className="bg-white text-black p-1 rounded">
          increase
        </button>
        <button
          onClick={previousStep}
          className="bg-white text-black p-1 rounded"
        >
          decrease
        </button>
      </div>
    </>
  );
}
