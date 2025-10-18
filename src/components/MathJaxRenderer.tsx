import React, { useEffect, useRef } from "react";

// MathJax configuration
const mathJaxConfig = {
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
    processEscapes: true,
    processEnvironments: true,
  },
  svg: {
    fontCache: "global",
  },
};

let mathJaxPromise = null;

const loadMathJax = async () => {
  if (mathJaxPromise) return mathJaxPromise;

  mathJaxPromise = import("mathjax").then(({ mathjax }) => {
    const MathJax = mathjax.init({
      loader: {
        load: ["input/tex", "output/svg"],
      },
      ...mathJaxConfig,
    });
    return MathJax;
  });

  return mathJaxPromise;
};

function MathJaxRenderer({ children, inline = false }) {
  const containerRef = useRef(null);
  const mathJaxRef = useRef(null);

  useEffect(() => {
    const renderMath = async () => {
      if (!containerRef.current || !children) return;

      try {
        const MathJax = await loadMathJax();
        mathJaxRef.current = MathJax;

        // Set the container content
        containerRef.current.innerHTML = children;

        // Process the math
        await MathJax.typesetPromise([containerRef.current]);
      } catch (error) {
        console.error("MathJax rendering error:", error);
        // Fallback: show raw content
        if (containerRef.current) {
          containerRef.current.innerHTML = children;
        }
      }
    };

    renderMath();
  }, [children]);

  return (
    <span
      ref={containerRef}
      className={inline ? "mathjax-inline" : "mathjax-block"}
      style={{ display: inline ? "inline" : "block" }}
    />
  );
}

export default MathJaxRenderer;
