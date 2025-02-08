import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownText = `
# Daily Report - February 8, 2025

## Summary
Today, we reviewed **14 tasks** across two projects: **Juniper | (B2C)** and **Matcha**. One backend task and one frontend fix were **completed**, while the majority remain **not started**. With key deadlines approaching, prioritization is essential for timely completion.

## Project Updates

### Juniper | (B2C)
**Assignee: Riva Rodrigues**  
- **Backend Development:**
  - **Completed:** 1 backend task
  - **Not Started:** 5 backend tasks, including **Backend Implementation** and **Implement Backend Fix**
  - **Deadline:** February 10, 2025

**Assignee: Tabish Shaikh**  
- **Deployment on Azure:** Currently **in progress** (Deadline: January 7, 2025)

### Matcha
**Assignee: Tabish Shaikh**  
- **Frontend Fixes:**
  - **Completed:** 1 frontend fix
  - **Not Started:** 5 frontend fixes, including **Implement Frontend Fix** and **Frontend Fix Implementation**
  - **Deadline:** February 14, 2025

**Assignee: Riva Rodrigues**  
- **Fix: Multiple Internships:** **Not Started** (No due date assigned)

## Progress Highlights
- **Backend Progress:** 1 backend task completed
- **Frontend Progress:** 1 frontend fix completed

## Next Steps & Priorities
- **Juniper | (B2C)**:
  - Focus on completing backend tasks before **February 10**
  - Continue monitoring **Deployment on Azure**
- **Matcha**:
  - Prioritize frontend fixes before **February 14**
  - Assign a due date to **Fix: Multiple Internships**
- Ensure regular updates on task statuses to track progress effectively

This report provides a structured view of the current task status, helping in better project planning and execution.
`;

function MarkdownComponent() {
    return (
        <section>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownText}
            </ReactMarkdown>
        </section>
    );
}

export default MarkdownComponent;
