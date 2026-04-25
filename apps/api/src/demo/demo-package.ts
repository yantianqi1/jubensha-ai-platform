export const fogHarborDemoPackage = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "draft" as const,
  roles: [
    {
      role_code: "detective",
      name: "侦探",
      public_profile: "受邀调查雾港宅邸失踪案。",
    },
    {
      role_code: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家，熟悉每一扇窗。",
      private_secret: "他知道窗台划痕来自昨夜的闯入者。",
    },
    {
      role_code: "doctor",
      name: "医生",
      public_profile: "镇上医生，最后一次为死者开药。",
    },
  ],
  clues: [
    {
      clue_code: "C-01",
      title: "窗台划痕",
      content: "窗台上有一道新鲜划痕。",
      initial_visibility: [{ kind: "public" as const, value: "all" }],
      unlock_if: [],
    },
  ],
  meta: {
    summary: "雾港宅邸失踪案 demo。",
    tags: ["demo"],
    player_count: 3,
    truth: "窗台划痕揭示昨夜闯入者与管家的隐瞒。",
  },
  scenes: [
    {
      scene_code: "act1",
      phase: "investigation" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      actions: [
        {
          code: "inspect_window",
          allow_if: [],
          effect: [{ type: "reveal_clue" as const, clue_code: "C-01" }],
        },
      ],
      end_if: [{ op: "timer_expired" as const }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};
