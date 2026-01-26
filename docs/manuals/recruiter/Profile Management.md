# Candidate Profile Management

## The Command Center for Candidate Data
The **Candidate Profile** (or "Detail Modal") is the single source of truth for every applicant. It opens whenever you click on a candidate's name from any list.

![Candidate Detail UI Placeholder](file:///c:/Users/MD3770/Desktop/repo/studio-2/docs/manuals/assets/candidate_detail_placeholder.png)

## 1. Anatomy of the Profile Modal
The modal is divided into three main columns:

| Column | Content | Purpose |
| :--- | :--- | :--- |
| **Left: Identity** | Name, Contact, Social Links, Resume. | Quick identity verification and file access. |
| **Center: Timeline** | Activity Log, Comments, Stage History. | The "Audit Trail" of all interactions. |
| **Right: Evaluation** | AI Fit Score, Skills Match, Scorecards. | Decision-making metrics and scoring. |

## 2. The Evaluation Tab (Right Column)
This panel drives the decision-making process.

### 2.1 AI Deep Dive
*   **Fit Score**: Click the percentage badge to see *why* the AI gave that score. It lists:
    *   **Matched Skills**: Keywords found in both Resume and JD.
    *   **Missing Skills**: Critical gaps (red text).
    *   **Experience Match**: Years of experience vs requirement.

### 2.2 Scorecards
View feedback from all interviewers in one place.
*   **Summary**: expanding the row shows the average star rating (1-5).
*   **Details**: Click to read specific "Strengths" and "Red Flags" noted by the hiring manager.
*   **Status**:
    *   `Pending`: Interview scheduled but feedback not submitted.
    *   `Submitted`: Scorecard is complete.

## 3. Attachment Management
Manage resumes, portfolios, and cover letters.
*   **View**: Click the **"Eye"** icon on any file to preview it in-browser without downloading.
*   **Add**: Click **"Upload New Version"** to replace or append files.
*   **Download**: Click the **"Down Arrow"** to save to your local machine.

## 3. Comments & Activity Log
Collaborate with your team without leaving the app.
*   **Internal Notes**: Type in the box at the bottom center. Use `@mention` (future feature) to notify colleagues.
    *   *Example: "Spoke to candidate, they are available to start in March."*
*   **System Activity**: The system automatically logs:
    *   Stage changes (e.g., Screening → Interview).
    *   Email emails sent/received.
    *   Interview scheduled events.

## 4. Action Buttons (Top Bar)
Key actions to move the candidate forward:

| Button | Action | When to use |
| :--- | :--- | :--- |
| **Advance Stage** | Moves candidate to next step (e.g., Shortlist). | After passing an initial review. |
| **Reject** | Moves to "Rejected" bucket. | If qualifications are not met. (Optional: Configured to send rejection email). |
| **Schedule Interview** | Opens calendar to book time. | When proceeding to phone/onsite screens. |
| **Email** | Opens the email composer. | To ask clarifying questions or request info. |
| **Delete** | Removes record permanently. | Only for duplicate or GDPR deletion requests. |

## 5. Skills Actions
Manually refine the AI's analysis.
*   **Evaluate Skill**: Click on a skill tag (e.g., "Python") to give it a manual rating (Beginner/Intermediate/Expert). This overrides the AI's confidence score.
*   **Assign Skill**: Click **"+ Add Skill"** to manually tag a candidate with a qualification the parser missed (e.g., "Leadership").
*   **Delete Skill**: Click the **"X"** on a tag to remove irrelevant skills.

## 5. Visual Indicators
*   **Urgency Tags**: Look for red tags like **"Overdue"** or **"No Action (7 Days)"** which indicate a stalled pipeline.
*   **Fit Score Badge**:
    *   🟢 **Green (85%+)**: Strong match.
    *   🟡 **Yellow (60-84%)**: Moderate match.
    *   🔴 **Red (<60%)**: Weak match.
