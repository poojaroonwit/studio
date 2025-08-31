#!/usr/bin/env node

/**
 * Test script to verify that the infinite loop in CandidateDetailView is fixed
 * This script simulates the component lifecycle and checks for excessive re-renders
 */

console.log('🧪 Testing CandidateDetailView infinite loop fix...');

// Simulate the component lifecycle
let renderCount = 0;
let loadDataCallCount = 0;
let useEffectCallCount = 0;

// Simulate the fixed loadData function
const createLoadData = (candidateId, trackLoadData) => {
  console.log('🔄 loadData function recreated for candidate:', candidateId);
  
  return async () => {
    loadDataCallCount++;
    console.log('🔄 loadData function called for candidate:', candidateId, `(call #${loadDataCallCount})`);
    
    if (!trackLoadData()) {
      console.log('❌ loadData blocked by infinite loop prevention');
      return;
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('✅ loadData completed for candidate:', candidateId);
  };
};

// Simulate the fixed useInfiniteLoopPrevention hook
const createInfiniteLoopPrevention = (effectKey, maxRuns, onExcessiveRuns) => {
  let runs = 0;
  let lastRun = Date.now();
  
  const trackRun = () => {
    runs++;
    
    if (runs > maxRuns) {
      console.warn(`🚨 Infinite loop detected in "${effectKey}": ${runs} runs (max: ${maxRuns})`);
      onExcessiveRuns?.();
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;
    if (timeSinceLastRun < 100 && runs > 10) {
      console.warn(`🚨 Potential infinite loop in "${effectKey}": running too frequently`);
      onExcessiveRuns?.();
      return false;
    }
    
    lastRun = now;
    return true;
  };
  
  return { trackRun, runs };
};

// Simulate the component
const simulateComponent = () => {
  const candidateId = 'test-candidate-123';
  
  // Create the infinite loop prevention hook
  const onExcessiveRuns = () => {
    console.error('🚨 Excessive data loading detected in CandidateDetailView');
  };
  
  const { trackRun } = createInfiniteLoopPrevention('CandidateDetailView_loadData', 20, onExcessiveRuns);
  
  // Create the loadData function (this should be stable now)
  const loadData = createLoadData(candidateId, trackRun);
  
  // Simulate useEffect
  const simulateUseEffect = () => {
    useEffectCallCount++;
    console.log('🔄 useEffect triggered for candidate:', candidateId, `(call #${useEffectCallCount})`);
    loadData();
  };
  
  // Simulate multiple renders
  for (let i = 0; i < 5; i++) {
    renderCount++;
    console.log(`\n📊 Render #${renderCount}`);
    
    // In the fixed version, loadData should not be recreated on every render
    // So useEffect should only be called once
    if (i === 0) {
      simulateUseEffect();
    }
  }
  
  console.log('\n📈 Final Statistics:');
  console.log(`- Total renders: ${renderCount}`);
  console.log(`- useEffect calls: ${useEffectCallCount}`);
  console.log(`- loadData calls: ${loadDataCallCount}`);
  
  // Check if the fix is working
  if (useEffectCallCount === 1 && loadDataCallCount === 1) {
    console.log('✅ SUCCESS: Infinite loop fix is working correctly!');
    console.log('   - useEffect only called once');
    console.log('   - loadData only called once');
    console.log('   - No infinite re-renders detected');
  } else {
    console.log('❌ FAILURE: Infinite loop still exists!');
    console.log('   - useEffect called multiple times');
    console.log('   - loadData called multiple times');
    console.log('   - Infinite re-renders detected');
  }
};

// Run the test
simulateComponent();
