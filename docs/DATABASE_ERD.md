# FitScan Database ERD (Entity Relationship Diagram)

This document visualizes the **Core Data Flows** of the FitScan application. 

> [!NOTE]
> This Mermaid diagram focuses on essential relationships and critical entities to maintain high-level clarity. For a **holistic** breakdown of every database field, domain descriptions, and business logic constraints, please refer to the [ERD Specialist Guide](./ERD.md).

---

```mermaid
erDiagram
    %% Core User & Auth
    USER {
        uuid id PK
        string email UK
        string password
        string role
        string[] authenticationMethods
        boolean isActive
        string azure_oid UK
    }
    
    ACCOUNT {
        uuid id PK
        uuid userId FK
        string provider
        string providerAccountId
    }

    USER_ACTIVITY_LOG {
        uuid id PK
        uuid userId FK
        string action
        json details
    }

    %% Recruitment Core
    POSITION {
        uuid id PK
        string title
        string department
        boolean isOpen
        uuid recruiterId FK
        uuid gradeId FK
    }

    CANDIDATE {
        uuid id PK
        string name
        string email
        uuid positionId FK
        uuid recruiterId FK
        uuid statusId FK
        float fitScore
        boolean isBlacklisted
        json parsedData
    }

    RECRUITMENT_STAGE {
        uuid id PK
        string name UK
        boolean isSystem
        int sortOrder
    }

    TRANSITION_RECORD {
        uuid id PK
        uuid candidateId FK
        uuid positionId FK
        string stage
        uuid actingUserId FK
    }

    %% Evaluation Subsystem
    CANDIDATE_EVALUATION {
        uuid id PK
        uuid candidateId FK
        uuid evaluatorId FK
        string status
        float overallScore
    }

    EXPERTISE_SKILL {
        uuid id PK
        string name UK
        uuid groupId FK
    }

    PERSONALITY_TRAIT {
        uuid id PK
        string name UK
        uuid groupId FK
    }

    CANDIDATE_EXPERTISE_SCORE {
        uuid id PK
        uuid evaluationId FK
        uuid skillId FK
        int score
    }

    %% Infrastructure & Utility
    ATTACHMENT {
        uuid id PK
        uuid candidateId FK
        uuid uploadedById FK
        string filePath
        string label
    }

    HEADCOUNT {
        uuid id PK
        uuid positionId FK
        uuid candidateId FK
        string status
    }

    SYSTEM_API_KEY {
        uuid id PK
        string name
        string key_hash UK
        string key_prefix
        boolean is_active
    }

    %% Relationships
    USER ||--o{ ACCOUNT : "linked"
    USER ||--o{ USER_ACTIVITY_LOG : "triggers"
    USER ||--o{ POSITION : "manages"
    USER ||--o{ CANDIDATE : "sources"
    USER ||--o{ CANDIDATE_EVALUATION : "evaluates"
    USER ||--o{ ATTACHMENT : "uploads"
    
    POSITION ||--o{ CANDIDATE : "holds"
    POSITION ||--o{ HEADCOUNT : "budget"
    POSITION ||--o{ TRANSITION_RECORD : "flow history"
    
    CANDIDATE ||--o{ ATTACHMENT : "files"
    CANDIDATE ||--o{ TRANSITION_RECORD : "moves"
    CANDIDATE ||--o{ CANDIDATE_EVALUATION : "undergoes"
    CANDIDATE ||--o{ HEADCOUNT : "fills"
    
    RECRUITMENT_STAGE ||--o{ CANDIDATE : "status"
    
    CANDIDATE_EVALUATION ||--o{ CANDIDATE_EXPERTISE_SCORE : "results"
    EXPERTISE_SKILL ||--o{ CANDIDATE_EXPERTISE_SCORE : "measured"
```

---

## 🛠️ Field Documentation System
FitScan uses a "Code as Documentation" approach. Detailed field descriptions (visible in your DB client) are maintained directly in the source code:

1.  **Source**: `prisma/schema.prisma` using `///` comments.
2.  **Generator**: `prisma-db-comments-generator`.
3.  **Sync**: Run `npm run db:comments` to apply these descriptions to the live PostgreSQL database.

For a full guide on this process, see [Database Comments Flow](./DATABASE_COMMENTS_FLOW.md).
