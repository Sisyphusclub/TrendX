export type DashboardSection =
  | "overview"
  | "controls"
  | "signals"
  | "risk"
  | "journal";

export const dashboardSectionItems = [
  {
    key: "overview",
    label: "总览",
  },
  {
    key: "signals",
    label: "信号",
  },
  {
    key: "journal",
    label: "交易历史",
  },
  {
    key: "risk",
    label: "市场新闻",
  },
  {
    key: "controls",
    label: "设置",
  },
] as const satisfies ReadonlyArray<{
  key: DashboardSection;
  label: string;
}>;

export const dashboardSectionMeta: Record<
  DashboardSection,
  {
    description: string;
    eyebrow: string;
    title: string;
  }
> = {
  controls: {
    description: "仅保留账户密码修改。",
    eyebrow: "设置",
    title: "修改密码",
  },
  journal: {
    description: "执行、成交与调度记录。",
    eyebrow: "交易历史",
    title: "交易历史",
  },
  overview: {
    description: "主导交易对、信号与风控状态。",
    eyebrow: "总览",
    title: "主控台",
  },
  risk: {
    description: "",
    eyebrow: "市场新闻",
    title: "市场新闻",
  },
  signals: {
    description: "单次只看一个交易对。",
    eyebrow: "信号",
    title: "交易对信号",
  },
};
