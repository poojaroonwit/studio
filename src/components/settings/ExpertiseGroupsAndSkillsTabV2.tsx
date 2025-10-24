"use client";

import React from 'react';
import BaseGroupsAndItemsTab from './BaseGroupsAndItemsTab';

export default function ExpertiseGroupsAndSkillsTabV2() {
  return (
    <BaseGroupsAndItemsTab
      title="Expertise Groups & Skills"
      groupTitle="Expertise Groups"
      itemTitle="Expertise Skills"
      groupsEndpoint="/api/v1/evaluation/expertise-groups"
      itemsEndpoint="/api/v1/evaluation/expertise-skills"
      showSkillFields={true}
      showGroupDetailsModal={true}
    />
  );
}
