# Dashboard Overview

![Recruiter Dashboard](file:///c:/Users/MD3770/Desktop/repo/studio-2/docs/manuals/assets/dashboard_overview.png)

## The Story of Your Command Center

| Feature | Description |
| :--- | :--- |
| **What** | A high-level mission control summarizing recruitment status and task priorities. |
| **Who** | **Recruiters** who manage multiple positions and candidates. |
| **When** | Every morning and throughout the day to monitor recruitment velocity. |
| **Why** | To ensure no candidate is forgotten and to provide instant reporting to stakeholders. |
| **Where** | The **Home** screen of the application. |
| **How** | 1. Go to **Dashboard** <br> 2. View **"Pipeline Stats"** <br> 3. Refresh after candidate moves <br> 4. Check **"Live Feed"** for updates <br> 5. Click **"Action Items"** to complete tasks |

## 1. Pipeline Stats
A numerical summary of your current workload. It tracks:
- **Active Jobs**: Number of open roles assigned to you.
- **Funnel Depth**: Total candidates currently in Screening, Interview, and Offer stages.

- **Active Jobs**: Number of open roles assigned to you.
- **Funnel Depth**: Total candidates currently in Screening, Interview, and Offer stages.

## 2. Analytics Charts
Understand your pipeline health at a glance.

### 2.1 New Applications (Time Series)
*   **What**: A line graph showing the volume of new applicants over the last 30 days.
*   **Why**: Spot trends. A sudden spike might mean a job board boost worked; a drop might mean a posting expired.

### 2.2 Candidates Per Position
*   **What**: A breakdown of candidate volume for each active role.
*   **Why**: Identify which roles are "starved" (need sourcing) and which are "flooded" (need screening).

### 2.3 AI Score Distribution
*   **What**: A histogram grouping current candidates by their AI Fit Score.
*   **Why**: Validation of quality. Ideally, you want a bell curve or a skew towards high scores. If everyone is Low Score, your JD might be mismatched with the applicant pool.

### 2.4 SLA Violations Widget
*   **What**: A red-alert list of candidates who have been sitting in a stage longer than the allowed time (e.g., "In Screening > 5 days").
*   **Action**: Click on a violation to jump to that candidate and take immediate action.

## 3. How to Verify (Test Case)
To ensure data accuracy:
1.  **Navigate**: Note the current number in the **"New Applicants"** widget.
2.  **Act**: Upload a new resume in the **"Candidates"** module.
3.  **Confirm**: Return to the **Dashboard** and refresh. The "New Applicants" count should have incremented by 1.

