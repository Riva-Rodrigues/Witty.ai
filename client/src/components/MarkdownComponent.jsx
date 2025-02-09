import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MarkdownComponent({ markdownText }) {
    return (
        <section>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {markdownText}
            </ReactMarkdown>
        </section>
    );
}

export default MarkdownComponent;
