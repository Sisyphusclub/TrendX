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
    key: "controls",
    label: "控制",
  },
  {
    key: "signals",
    label: "信号",
  },
  {
    key: "risk",
    label: "风险",
  },
  {
    key: "journal",
    label: "日志",
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
    description: "入场、分段与保护边界。",
    eyebrow: "控制",
    title: "执行规则",
  },
  journal: {
    description: "调度、动作与保护记录。",
    eyebrow: "日志",
    title: "执行记录",
  },
  overview: {
    description: "主导交易对、信号与风控状态。",
    eyebrow: "总览",
    title: "主控台",
  },
  risk: {
    description: "权益、保证金与当前暴露。",
    eyebrow: "风险",
    title: "风险账本",
  },
  signals: {
    description: "单次只看一个交易对。",
    eyebrow: "信号",
    title: "交易对信号",
  },
};
