# GitHub 仓库合并记录 · 2026-10-10

## 保留与迁入

- 主仓库：[BH2-4/MCSociologyMock](https://github.com/BH2-4/MCSociologyMock)。
- 原实验仓库：[BH2-4/zzz-release-risk-lab](https://github.com/BH2-4/zzz-release-risk-lab)。
- 迁入位置：[`labs/zzz-release-risk-lab/`](../labs/zzz-release-risk-lab/)。
- 合并方式：无 squash 的 Git subtree，保留原提交 SHA 和完整历史。
- 原仓库在合并验证完成后归档，只保留一个活跃开发仓库。永久删除属于后续单独确认的操作。

## 调查结果

两仓库没有共同提交祖先，也没有路径及内容均相同的文件，不能按重复副本删除。

| 项目 | MC | ZZZ 主分支 |
| --- | --- | --- |
| 主分支提交 | `e6e660a856c4fa7585c615a1d18867c676d0d7e8` | `4665167b4ce3dd798a66032141255d047b491a4e` |
| Git tree | `2fe41c1e91eef3fdd97d6819eb0eeee0a00d126f` | `c006ba2f8bbd091cf4d55898ea8e7e9f4ed66450` |
| 主分支提交数 | 35 | 34 |
| 跟踪文件数 | 106 | 153 |
| 实现 | Next.js、TypeScript、pnpm workspace | JavaScript、npm、静态沙盘与 Three.js 回放 |
| 主要用途 | Gesellschaft 配对社会实验与日本发行决策 | 证据受限的发行风险情景推演 |

主分支差异共 254 个路径：MC 独有 101 个，ZZZ 独有 148 个，同路径但不同内容 5 个。主平台的 package、lockfile、workspace 和运行逻辑无需与实验模块强行合并。

## 分支与未完成 PR

原 ZZZ [草稿 PR #1](https://github.com/BH2-4/zzz-release-risk-lab/pull/1) 尚未完成整体 MVP。其头提交为 `532a799259561cac63bf3edba032a52992f02075`，比原 ZZZ 主分支多 19 次提交，最近 macOS CI 已通过。草稿的通过记录不能等同于全部 MVP 功能已交付。

以下原始分支在主仓库中完整保留，名称用于历史快照，不作为日常开发分支：

| 原分支 | 主仓库保留分支 | 原提交 |
| --- | --- | --- |
| `main` | `codex/archive/zzz-release-risk-lab/main` | `4665167b4ce3dd798a66032141255d047b491a4e` |
| `gsd/phase-1-trustworthy-theory-pipeline` | `codex/archive/zzz-release-risk-lab/gsd-phase-1-trustworthy-theory-pipeline` | `532a799259561cac63bf3edba032a52992f02075` |

原 PR 在迁移成功后关闭，讨论及审查记录继续由归档仓库保留，另有本地 JSON 快照。历史快照分支保持原 ZZZ 根目录结构；恢复该草稿时需将修改迁到 `labs/zzz-release-risk-lab/`，不得误把整个原根目录覆盖主平台。

## GitHub 配置

调查时两仓库均为公开、非 fork，无 tag、release、部署记录、environment、webhook、Actions secret、Actions variable 或 ruleset，GitHub Pages 和 Discussions 均未启用。ZZZ 没有普通 issue；唯一未关闭项为上述草稿 PR。

MC 原有协作者权限保留。ZZZ 原有 CI 文件收入模块目录作为来源快照，不会自动成为主仓库 CI。原 Actions 历史及 PR 记录继续位于归档仓库；本地快照用于查阅，不等同于可导入 GitHub 的完整还原包。

MC 现有发行数据批次锁定了根 README、DoD 和数据实现的来源哈希，因此这些原文件保持不变，模块入口集中在 `labs/README.md`。GitHub Projects V2 因现有登录缺少 `read:project` 权限而未读取或备份；原仓库的项目链接随归档保留。ZZZ 的 wiki Git 地址返回不存在，没有取得 wiki 内容。

## 验证与恢复

- 比对迁入模块的 Git tree，要求与原 ZZZ 主分支 tree 完全相同。
- 比对 MC 原有 106 个跟踪文件，全部保持内容不变。
- 主平台执行一次 `pnpm install --frozen-lockfile` 与 `pnpm build`。
- 模块执行一次 `npm ci` 与 `npm run build`。
- 现有发行数据 CI 在合并 PR 中复验。
- 本次只迁移已有代码，不新增测试，不运行全量单元测试或浏览器测试。

本机恢复包目录：`/Users/arco/Documents/advx26/repository-consolidation-2026-10-10/`。其中包含两个原仓库的 bare mirror、完整 Git bundle，以及元数据、PR 内容、提交、评论和审查快照。两个 bundle 均已通过 `git bundle verify`。

需要恢复原 ZZZ Git 代码时，在恢复目录执行：

```bash
git clone zzz-release-risk-lab.bundle restored-zzz-release-risk-lab
```

归档可以撤销；若要永久删除原仓库，应先确认能够接受失去原仓库地址及 GitHub 原生记录，并保留恢复包。删除不会让代码合并结果更完整。
