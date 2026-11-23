declare module "*.mdx" {
  import type { ComponentType } from "react";
  export const meta: import("./lessons").LessonMeta;
  const Page: ComponentType;
  export default Page;
}
declare module "@widgets/*";
declare module "*.js";
