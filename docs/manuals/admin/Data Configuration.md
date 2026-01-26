# Data Configuration

## The Story of Custom Data Structures

| Feature | Description |
| :--- | :--- |
| **What** | Tools to customize the recruitment lifecycle (Stages, Sources) and extend the database schema (Custom Fields). |
| **Who** | **System Administrators** and **HR Operations Managers**. |
| **When** | When your organization changes its hiring process or needs to track new data points like "Salary Expectations." |
| **Why** | To allow the software to grow with your business needs without requiring professional development support. |
| **Where** | **Settings > Data Configuration** and **Settings > Custom Fields**. |
| **How** | 1. Navigate to **Data Configuration** <br> 2. Select **"Candidate"** entity <br> 3. Create **"Expected Salary"** field <br> 4. Choose type **"Number"** <br> 5. Click **"Save"** and verify the field appears in the Filter sidebar |

## 1. Pipeline Customization
- **Recruitment Stages**: Drag and drop to reorder how candidates flow from "Applied" to "Hired."
- **Source Tracking**: Add custom tags for "LinkedIn", "Referral", and "Agencies" to monitor where your best talent originates.

> [!NOTE]
> System-protected stages (Applied, Hired, Rejected) cannot be deleted as they are tied to core analytics functions.

## 2. How to Verify (Test Case)
To verify custom data:
1.  **Navigate**: Go to **"Settings > Custom Fields"**.
2.  **Act**: Create a new field for the **"Position"** entity named "Internal ID".
3.  **Confirm**: Open any Position record. The new "Internal ID" field should appear in the details section, allowing you to enter data.
