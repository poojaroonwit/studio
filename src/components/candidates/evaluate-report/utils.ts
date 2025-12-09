import type { AveragedEvaluationData, GroupedTrait, GroupedSkill } from './types';
import type { PersonalityGroup } from '@prisma/client';
import { getScoreColorInfo } from '@/components/ui/score-color';

// Format personality score: show as rounded integer
export const formatPersonalityScore = (score: number): string => {
    return Math.round(score).toString();
};

// Group expertise skills by group
export const groupExpertiseSkills = (
    averagedEvaluationData: AveragedEvaluationData | null,
    personalityGroupsConfig: PersonalityGroup[]
): GroupedSkill[] => {
    if (!averagedEvaluationData?.expertiseScores) return [];

    const groupMap = new Map<string, GroupedSkill>();

    averagedEvaluationData.expertiseScores.forEach(es => {
        const group = es.skill.group;
        const groupId = group?.id || 'ungrouped';
        const groupName = group?.name || 'No Group';
        const groupColor = group?.color || '#6B7280';

        if (!groupMap.has(groupId)) {
            groupMap.set(groupId, {
                groupId,
                groupName,
                groupColor,
                skills: []
            });
        }

        const percentage = (es.averageScore / es.skill.maxScore) * 100;
        groupMap.get(groupId)!.skills.push({
            id: es.skill.id,
            name: es.skill.name,
            score: es.averageScore,
            maxScore: es.skill.maxScore,
            percentage
        });
    });

    // Sort groups by their sortOrder from config, then alphabetically
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
        // Try to find in personality groups config (some groups might be shared)
        const aGroup = personalityGroupsConfig.find(g => g.name === a.groupName);
        const bGroup = personalityGroupsConfig.find(g => g.name === b.groupName);

        // If both groups are in config, sort by sortOrder
        if (aGroup && bGroup) {
            if (aGroup.sortOrder !== bGroup.sortOrder) {
                return aGroup.sortOrder - bGroup.sortOrder;
            }
            return a.groupName.localeCompare(b.groupName);
        }

        // If only one is in config, prioritize it
        if (aGroup) return -1;
        if (bGroup) return 1;

        // If neither is in config, sort alphabetically
        return a.groupName.localeCompare(b.groupName);
    });
};

// Group personality traits by group
export const groupPersonalityTraits = (
    averagedEvaluationData: AveragedEvaluationData | null,
    personalityGroupsConfig: PersonalityGroup[]
): GroupedTrait[] => {
    if (!averagedEvaluationData?.personalityScores) return [];

    const groupMap = new Map<string, GroupedTrait>();

    averagedEvaluationData.personalityScores.forEach(ps => {
        const group = ps.trait.group;
        const groupId = group?.id || 'ungrouped';
        const groupName = group?.name || 'No Group';
        const groupColor = group?.color || '#6B7280';

        if (!groupMap.has(groupId)) {
            groupMap.set(groupId, {
                groupId,
                groupName,
                groupColor,
                traits: []
            });
        }

        // Personality scores are 1-5, convert to percentage
        const percentage = ((ps.averageScore - 1) / 4) * 100;
        groupMap.get(groupId)!.traits.push({
            id: ps.trait.id,
            name: ps.trait.name,
            description: ps.trait.description,
            score: ps.averageScore,
            percentage
        });
    });

    // Sort groups by their sortOrder from config, then alphabetically
    const groups = Array.from(groupMap.values());
    return groups.sort((a, b) => {
        // Find groups in config by name
        const aGroup = personalityGroupsConfig.find(g => g.name === a.groupName);
        const bGroup = personalityGroupsConfig.find(g => g.name === b.groupName);

        // If both groups are in config, sort by sortOrder
        if (aGroup && bGroup) {
            if (aGroup.sortOrder !== bGroup.sortOrder) {
                return aGroup.sortOrder - bGroup.sortOrder;
            }
            return a.groupName.localeCompare(b.groupName);
        }

        // If only one is in config, prioritize it
        if (aGroup) return -1;
        if (bGroup) return 1;

        // If neither is in config, sort alphabetically
        return a.groupName.localeCompare(b.groupName);
    });
};

// Get trait scores by evaluator
export const getTraitScoresByEvaluator = (traitId: string, allEvaluations: any[]) => {
    const scores: Array<{ evaluatorId: string; evaluatorName: string; score: number }> = [];
    allEvaluations.forEach(evaluation => {
        const traitScore = evaluation.personalityScores?.find((ps: any) => ps.trait?.id === traitId);
        if (traitScore && evaluation.evaluator) {
            scores.push({
                evaluatorId: evaluation.evaluator.id,
                evaluatorName: evaluation.evaluator.name || 'Unknown',
                score: traitScore.score
            });
        }
    });
    return scores;
};

// Get all unique evaluators for a group
export const getEvaluatorsForGroup = (group: GroupedTrait, allEvaluations: any[]) => {
    const evaluatorMap = new Map<string, { id: string; name: string }>();
    group.traits.forEach(trait => {
        const scores = getTraitScoresByEvaluator(trait.id, allEvaluations);
        scores.forEach(score => {
            if (!evaluatorMap.has(score.evaluatorId)) {
                evaluatorMap.set(score.evaluatorId, {
                    id: score.evaluatorId,
                    name: score.evaluatorName
                });
            }
        });
    });
    return Array.from(evaluatorMap.values());
};

// Get score for a specific trait by a specific evaluator
export const getTraitScoreByEvaluator = (traitId: string, evaluatorId: string, allEvaluations: any[]): number | null => {
    const evaluation = allEvaluations.find(e => e.evaluator?.id === evaluatorId);
    if (!evaluation) return null;
    const traitScore = evaluation.personalityScores?.find((ps: any) => ps.trait?.id === traitId);
    return traitScore?.score ?? null;
};
