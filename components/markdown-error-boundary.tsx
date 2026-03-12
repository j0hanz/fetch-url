"use client";

import { Component, type ReactNode } from "react";
import Alert from "@mui/material/Alert";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class MarkdownErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" variant="outlined">
          Failed to render markdown preview.
        </Alert>
      );
    }

    return this.props.children;
  }
}
