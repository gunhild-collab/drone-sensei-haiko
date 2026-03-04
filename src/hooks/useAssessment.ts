import { useState, useCallback } from "react";
import { dimensions, calculateWeightedScore, calculateDimensionScore, getMaturityLevel } from "@/data/dmvData";

export function useAssessment() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentDimension, setCurrentDimension] = useState(0);
  const [municipalityName, setMunicipalityName] = useState("");
  const [assessorName, setAssessorName] = useState("");

  const setAnswer = useCallback((questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const totalScore = calculateWeightedScore(answers);
  const maturityLevel = getMaturityLevel(totalScore);

  const dimensionScores = dimensions.map(d => ({
    dimension: d,
    score: calculateDimensionScore(answers, d.id),
    rawTotal: d.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0),
    maxTotal: d.questions.length * 4,
    answeredCount: d.questions.filter(q => answers[q.id] !== undefined).length,
  }));

  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = dimensions.reduce((sum, d) => sum + d.questions.length, 0);
  const progress = (totalAnswered / totalQuestions) * 100;

  const resetAssessment = useCallback(() => {
    setAnswers({});
    setCurrentDimension(0);
    setMunicipalityName("");
    setAssessorName("");
  }, []);

  return {
    answers,
    setAnswer,
    currentDimension,
    setCurrentDimension,
    municipalityName,
    setMunicipalityName,
    assessorName,
    setAssessorName,
    totalScore,
    maturityLevel,
    dimensionScores,
    totalAnswered,
    totalQuestions,
    progress,
    resetAssessment,
  };
}
