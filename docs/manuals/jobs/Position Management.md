# Position Management Module

## The Story of a Job Opening

| Feature | Description |
| :--- | :--- |
| **What** | The central hub for creating, managing, and filling job requisitions. |
| **Who** | **Recruiters** (Owners) and **Hiring Managers** (Collaborators). |
| **When** | From the moment a need is identified until the role is filled. |
| **Why** | To organize candidates, track headcount, and ensure clear requirements (JD) are distributed. |
| **Where** | **Positions** module. |
| **How** | 1. **Create Position** (Basic Info) <br> 2. **Config Team** (Add Manager) <br> 3. **Set Headcount** <br> 4. **Generate JD** <br> 5. **Publish** |

## 1. Creating a Position
The lifecycle begins with a "Quick Create" modal.
1.  Click **"New Position"**.
2.  **Basic Info**:
    *   **Title**: Internal title (e.g., "Senior React Dev").
    *   **Department**: For budget tracking.
    *   **Recruiter**: The primary owner.
3.  Click **"Add Position"**. The role is created in "Draft" mode.

## 2. Configuring the Position (The Drawer)
Deep configuration happens in the Position Drawer.

### 2.1 General & Description
*   **Job Description**: Use the **AI Generator** to draft a JD based on the title.
*   **Status**: Toggle `Open` / `Closed` / `Draft`.

### 2.2 Hiring Team
Define who can see and interview candidates.
*   **Recruiters**: Add co-owners.
*   **Hiring Managers**: Grant access to the manager so they can see shortlists.
*   **Interviewers**: Add team members who will conduct interviews (but not manage the role).

### 2.3 Headcount & Quota
*   **Headcount**: Set the number of opening slots (e.g., 3).
*   **Hired Count**: Automatically increments when a candidate is moved to "Hired" stage.

### 2.4 Match Criteria
Configure the AI matching engine for this specific role.
*   **Must-Haves**: Skills that trigger a high score.
*   **Nice-to-Haves**: Bonus points.

## 3. Publishing
Once configured, toggle the status to **"Open"**.
*   The position becomes visible in the " Careers Page" (if integrated) and available for candidate assignment.
