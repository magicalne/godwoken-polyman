import React from "react";
import { useParams } from "react-router";
import { useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { gruvboxDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

export type SimpleJsonInfoProps = {
  title?: string;
  jsonInfo: string | object | undefined;
};

export default function SimpleJsonInfo(props: SimpleJsonInfoProps) {
  const { title, jsonInfo } = props;
  const [displayJsonInfo, setDisplayJsonInfo] = useState<string>();

  console.log(typeof jsonInfo);

  useEffect(() => {
    if (typeof jsonInfo === "string") setDisplayJsonInfo(jsonInfo);
    else setDisplayJsonInfo(JSON.stringify(jsonInfo, null, 2));
  }, [jsonInfo]);

  return (
    <div>
      {title || ""}
      <SyntaxHighlighter language="javascript" style={gruvboxDark}>
        {displayJsonInfo || ''}
      </SyntaxHighlighter>
    </div>
  );
}
