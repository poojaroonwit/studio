"use client";

import React from 'react';
import BaseGroupsAndItemsTab from './BaseGroupsAndItemsTab';

export default function PersonalityGroupsAndTraitsTabV2() {
  return (
    <BaseGroupsAndItemsTab
      title="Personality Groups & Traits"
      groupTitle="Personality Groups"
      itemTitle="Personality Traits"
      groupsEndpoint="/api/v1/evaluation/personality-groups"
      itemsEndpoint="/api/v1/evaluation/personality-traits"
      showSkillFields={false}
      showGroupDetailsModal={false}
    />
  );
}
