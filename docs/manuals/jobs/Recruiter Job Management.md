# Job Management (Positions)
**Role:** Recruiter

## The Story of Requisition Management

| Feature | Description |
| :--- | :--- |
| **What** | The structural foundation for all hiring activities, defining what talent is needed. |
| **Who** | **Recruiters** who act as the primary owners of the job lifecycle. |
| **When** | From the moment a department requests a new hire until the role is filled. |
| **Why** | To standardize the hiring process and provide AI with the parameters needed to find talent. |
| **Where** | The **Positions** module. |
| **How** | 1. Go to **Positions** <br> 2. View the **Active Requisitions** <br> 3. Click **"New Position"** (or **"Duplicate"**) <br> 4. Define Title & Department <br> 5. Assign Hiring Team |

### 1. Active Job Requisitions
Manage all hiring needs in a single view.

![Positions List](file:///c:/Users/MD3770/Desktop/repo/studio-2/docs/manuals/assets/jobs_list.png)

## 2. Searching & Filtering
Locate specific roles quickly using the top bar controls:

| Filter | Usage |
| :--- | :--- |
| **Search Bar** | Text search by Position Title or Reference ID. |
| **Status Dropdown** | Toggle between `Active`, `Internal`, `Closed`, or `Draft`. |
| **Department** | Filter by business unit (e.g., `Sales`, `Engineering`). |
| **Recruiter** | View jobs assigned to a specific team member. |

## 2. Managing Positions (The Drawer)
When you create or edit a position, a side drawer opens from the right. This **"Position Drawer"** allows for focused data entry without leaving the list view.

### 2.1 Drawer Sections
| Section | Description | Key Actions |
| :--- | :--- | :--- |
| **Basic Info** | Core identifiers (Title, Dept, Level). | Set Title, Department, and External Link. |
| **Description** | Full text JD with AI generation. | Generate descriptions using Gemini AI. |
| **Match Criteria** | AI configuration rules. | Toggle "Must-Have" vs "Nice-to-Have" skills. |
| **Headcount** | Quota tracking. | Manage total slots and hired count (Edit Mode only). |
| **Hiring Team** | Stakeholder permissions. | Add Recruiters and Interviewers (Edit Mode only). |

### 2.2 Adding a New Position (Quick Create)
1.  Click **"New Position"** in the top navigation bar.
2.  A **Modal** window appears for quick setup.
3.  Fill in the **Basic Information**:
    *   **Position Title**: (e.g., `Senior Frontend Engineer`)
    *   **Department**: (e.g., `Product`)
    *   **Position Level & Grade**: (Optional) For salary banding.
    *   **Assigned Recruiter**: The primary owner.
4.  **AI Description**: You can click **"Let's AI Generate"** to draft a JD automatically based on the title.
5.  Click **"Add Position"**.

*Note: Advanced settings like Headcount and full Hiring Team are configured in the Edit Drawer after creation.*

### 2.2 Updating & Editing
To modify an existing role:
1.  Locate the position in the list.
2.  Click the **Edit (Pencil)** icon.
3.  Update fields such as **Headcount** or **Status**.
    *   *Note: changing status to 'Closed' will hide it from the candidate portal.*

### 2.3 Duplicating Roles
Safe time by cloning existing setups:
1.  Click the **Copy** icon next to a similar role.
2.  The system creates a draft with `(Copy)` in the title.
3.  All **Match Criteria** and **Hiring Team** settings are preserved.

### 2.4 Deleting
*   **Action**: Click the **Trash Can** icon.
*   **Warning**: This action is permanent. For history preservation, recommend changing status to **Closed** instead.

## 3. Match Criteria Configuration
The AI uses these fields to score candidates. Accuracy here is critical.

## 4. Hiring Team & Permissions
Assign users to control visibility and notifications:
- **Recruiter**: Primary owner. Receives all application alerts.
- **Hiring Manager**: Department lead. Can review candidates and provide feedback but cannot change job settings.
- **Interviewers**: Ad-hoc members invited to specific interview loops.

## 5. Headcount Logic
The system automatically tracks hiring progress against your quota:
*   **Total Headcount**: Defined at job creation (e.g., 5 slots).
*   **Hired Count**: Increments when a candidate is moved to "Hired" status.
*   **Remaining**: `Total - Hired`.
*   **Alert**: The system warns if you attempt to hire more candidates than the remaining headcount allows.

## 3. How to Verify (Test Case)
To test job duplication:
1.  **Navigate**: Go to the **Positions** list and select an existing role.
2.  **Act**: Click the **"Duplicate"** icon in the top right.
3.  **Confirm**: A new position should be created with "(Copy)" in the title. Verify that all requirements and hiring team assignments have been correctly carried over.

