/**
 * Application Use Cases
 * Exports all business logic use cases
 */

export { SearchPapersUseCase } from "./SearchPapersUseCase";
export type {
  SearchPapersInput,
  SearchPapersOutput,
} from "./SearchPapersUseCase";

export { GetPaperUseCase } from "./GetPaperUseCase";
export type { GetPaperByIdInput, GetPaperByDoiInput } from "./GetPaperUseCase";

export { ManageStarredPapersUseCase } from "./ManageStarredPapersUseCase";
export type {
  StarPaperInput,
  UnstarPaperInput,
  GetStarredPapersOutput,
} from "./ManageStarredPapersUseCase";

export { ManageOpenPapersUseCase } from "./ManageOpenPapersUseCase";
export type {
  OpenPaperInput,
  ClosePaperInput,
  GetOpenPapersOutput,
} from "./ManageOpenPapersUseCase";

export { DownloadPaperUseCase } from "./DownloadPaperUseCase";
export type {
  DownloadPaperInput,
  DownloadPaperOutput,
} from "./DownloadPaperUseCase";
