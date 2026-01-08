export interface EvaluationData {
  expertiseScores: any[];
  personalityScores: any[];
  overallScore: number;
  status: string;
  comments: string;
  evaluator: {
    name: string;
    email: string;
  };
  completedAt: string;
}

export interface AveragedEvaluationData {
  overallScore: number;
  personalityScores: Array<{
    trait: {
      id: string;
      name: string;
      description?: string;
      group?: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
    averageScore: number;
    evaluatorCount: number;
  }>;
  evaluatorCount: number;
  expertiseScores?: Array<{
    skill: {
      id: string;
      name: string;
      maxScore: number;
      group: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
    averageScore: number;
    evaluatorCount: number;
  }>;
}

export interface GroupedTrait {
  groupId: string;
  groupName: string;
  groupColor: string;
  traits: Array<{
    id: string;
    name: string;
    description?: string;
    score: number;
    percentage: number;
  }>;
}

export interface GroupedSkill {
  groupId: string;
  groupName: string;
  groupColor: string;
  skills: Array<{
    id: string;
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;
}

