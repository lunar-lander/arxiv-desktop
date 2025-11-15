/**
 * Custom React Hooks
 * Exports all custom hooks for the application
 */

export { useTextSelection } from "./useTextSelection";
export type {
  TextSelectionState,
  UseTextSelectionReturn,
} from "./useTextSelection";

export { usePdfZoom } from "./usePdfZoom";
export type {
  ContainerSize,
  UsePdfZoomProps,
  UsePdfZoomReturn,
} from "./usePdfZoom";

export { usePdfState } from "./usePdfState";
export type {
  Paper as PdfPaper,
  PdfViewState,
  UsePdfStateProps,
  UsePdfStateReturn,
} from "./usePdfState";

export { usePaperActions } from "./usePaperActions";
export type {
  Paper as ActionPaper,
  UsePaperActionsProps,
  UsePaperActionsReturn,
} from "./usePaperActions";
