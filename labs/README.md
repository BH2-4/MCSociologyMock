# 研究实验模块

## ZZZ Release Risk Lab

位置：[`zzz-release-risk-lab/`](./zzz-release-risk-lab/)。完整项目说明见 [模块 README](./zzz-release-risk-lab/README.md)。

该模块研究《绝区零》发行决策的情景风险，包含证据账本、理论映射、42 天合成群体推演、3D 回放和未部署的测试网承诺合约。它与根目录 Gesellschaft 平台具有不同的研究问题和实现，分别运行。

从仓库根目录执行：

```bash
cd labs/zzz-release-risk-lab
npm ci
npm run build
npm start
```

浏览器入口：

- `http://127.0.0.1:4173/`：风险沙盘。
- `http://127.0.0.1:4173/simulation/`：离线 3D 回放。

`npm run build` 只编译合约，不部署、不签名、不发起链上交易。原项目的 `npm test` 与 `npm run test:e2e` 仍可在模块目录使用；本次迁移只要求构建验证。

该目录保持原 ZZZ 主分支 `4665167b4ce3dd798a66032141255d047b491a4e` 的文件内容不变。模块 README 中的研究时点和开发状态属于原项目快照；其中指向作者本机或原上级目录的历史材料链接不包含在源仓库内。

未完成的草稿 PR 没有作为已发布功能合入此目录。原草稿代码完整保存在本仓库的 `codex/archive/zzz-release-risk-lab/gsd-phase-1-trustworthy-theory-pipeline` 分支；该分支保持原仓库根目录布局，后续恢复工作时需先迁移路径。迁移详情见 [合并记录](../docs/repository-consolidation-2026-10-10.md)。

模块原有 `.github/workflows/ci.yml` 作为来源快照保留在模块内部，GitHub 不会执行嵌套目录中的 workflow。主仓库现有 CI 继续检查发行数据；模块后续修改时须在模块目录构建，CI 接入可独立处理。
