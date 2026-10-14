---
name: delivery-status-update
description: 更新既有交付说明中的接纳状态和薄启动方法，保留历史证据边界。
---

# 交付说明更新

遵守合并后的 Work Order，仅修改 `docs/delivery-first-task.md`。
读取该文档和 `data/publishing-mvp/manifest.json`；它们固定在工单的准备提交。
PR 合并事实使用可信准备步骤提供的完整提交、时间和链接，不联网自行补证。

在原有说明中增加清晰的当前接纳检查点：首轮五个数据文件已由 PR #2 接纳，
manifest 的计数为 3 个 sources、14 个 facts、8 个 gaps；保持
`local_inventory_only` 和 `external_verification=false` 的边界。
保留原 onboarding 阶段的历史，避免将当时“未运行”描述成当前没有成果。
PR #3 的仓库整合属于后续迁入，不是一次新的数据验证。

补充 `agent-delivery launch --config /private/launch.json --plan-pr <已合并任务PR>
--work-order-path <已授权工单路径>` 的调用示例，说明配置固定模型、身份和
获准安装版本，凭据只存私有文件路径；不使用真实本机路径、不写凭据正文。
保持默认不自动合并，新的任务必须对应新的明确授权，不能重跑已交付的 r1。

本次只更新文档，不运行模拟、支付、联网研究、shell、测试、部署或额外模型。
不要声称新工具版本已在该项目完整业务验证通过。Worker 仅报告实际编辑和
逐项验收，机械校验、独立审查与 CI 由可信执行器另行完成。
