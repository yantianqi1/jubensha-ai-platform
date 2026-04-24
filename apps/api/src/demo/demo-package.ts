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
