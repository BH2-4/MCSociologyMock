# 检索日志与筛选记录

检索日期：2026-07-24（Asia/Shanghai）  
主题：面向市场实验的 LLM 多智能体微型社会，其最小可行社会模拟单元应由什么构成？

## 1. 检索矩阵

| 主题 | 英文概念簇 | 中文概念簇 | 目标证据 |
|---|---|---|---|
| 社会分析单位 | relational sociology; methodological individualism; unit of analysis; dyad; transaction | 关系社会学；方法论个体主义；分析单位；二元关系；互动事件 | 行动者、关系、角色、制度的本体地位 |
| 行动—结构循环 | structuration theory; duality of structure; rules and resources | 结构化理论；结构二重性；规则与资源 | 制度如何约束行动并被实践再生产 |
| 微观—宏观 | microfoundations; micro-macro link; generative explanation; social mechanisms | 微观基础；微观宏观连接；生成式解释；社会机制 | 局部规则如何产生并受宏观结构反馈 |
| ABM | agent-based social simulation; artificial society; bounded rationality; heterogeneous agents | 基于主体建模；人工社会；有限理性；异质主体 | 最小状态、互动、环境、标准描述 |
| 市场与扩散 | consumer ABM; innovation diffusion; word of mouth; social influence | 消费者主体模型；创新扩散；口碑；社会影响 | 产品投放变量、传播机制和结果指标 |
| 博弈与制度 | norm emergence; reciprocity; reputation; punishment; public goods | 规范涌现；互惠；声誉；惩罚；公共品 | 交易、合作、违约和制度执行 |
| 生成式 Agent | generative ABM; LLM social simulation; synthetic participants; behavioral validity | 生成式主体模型；大模型社会模拟；合成参与者；行为效度 | 记忆/规划能力、偏差、校准和复现 |
| 货币与链 | tokenomics; blockchain institutions; sociology of money; token economy simulation | 代币经济学；区块链制度；货币社会学；代币经济模拟 | 钱包/结算的必要性、制度价值和边界 |

## 2. 博查候选发现

调用方式：`POST https://api.bochaai.com/v1/web-search`；密钥只从环境变量 `BOCHA_API_KEY` 读取，未回显、未写入文件。博查只用于候选发现和查询扩展。

12 次查询合计返回 112 个结果位（含重复网页、二次转载和非论文结果；不是 112 篇独立论文）。主要查询如下：

1. `社会模拟 最小分析单位 方法论个体主义 关系社会学 dyad microfoundations agent-based social simulation foundational papers`
2. `peer reviewed foundational papers relational sociology micro macro link agent based social simulation Macy Willer Sawyer Epstein`
3. `agent based modeling marketing innovation diffusion consumer behavior validation review peer reviewed`
4. `social norms institution evolution trust reputation reciprocity public goods agent based model foundational papers`
5. `LLM agents social simulation generative agents human behavior validity peer reviewed survey 2023 2024 2025 2026`
6. `blockchain token economy agent based simulation sociology of money peer reviewed tokenomics`
7. `"Validation is the central challenge for generative social simulation" DOI journal`
8. `"Lost in Simulation" "LLM-Simulated Users" paper`
9. `"AgentSociety" large-scale simulation publication conference DOI`
10. `"From Individual to Society" LLM social simulation survey 2412.03563 publication`
11. `2026 peer reviewed LLM generated social science data statistical realism human simulation validity`
12. `2025 2026 generative social simulation LLM agents empirical validation human behavior study DOI`

查询扩展带来的关键新增：

- Larooij & Törnberg 的验证系统综述，正式在线日期 2025-11-18。
- Mou 等的综述已经从 arXiv 升级为 2026-04-17 的 *ACM Computing Surveys* 正式版本。
- Xie 等的 SSDataBench 于 2026-05-08 正式发表于 PNAS。
- AgentSociety 在 2026-04-10 更新至 v2，但截至检索日仍按预印本处理。
- Seshadri 等 2026 年关于模拟用户校准和群体差异的预印本。

用户提供全文后的补充发现查询（3 次、40 个结果位，含大量无关结果）：

13. `请查找并返回以下六篇论文的正式出版信息、DOI和原始来源页面：Gode Sunder 1993...; Cook Emerson...; Greif 1989...; Bolton Katok Ockenfels...; Jia Yuan 2024...; Jiang Norman Puzzello Sultanum Wright...`
14. `“An Experimental Study of Competitive Market Behavior Through LLMs” Jingru Jia Zehua Yuan 2024 official paper`
15. `“Is Money Essential? An Experimental Approach” Jiang Norman Puzzello Sultanum Wright official publication`

第 13 次合并查询几乎全部为无关网页，未用于证据；第 14 次精确题名查询定位到 arXiv 原始记录；第 15 次没有可靠定位正式版本。随后用 Crossref 题名/作者查询发现 *Is Money Essential?* 已于 2024 年发表于 *Journal of Political Economy*，再用 DOI 与 Richmond Fed 原始工作论文页交叉核验。此过程说明博查只承担候选发现，不能替代正式版本核验。

## 3. 原始来源核验

| 核验源 | 用途 | 本轮处理 |
|---|---|---|
| Crossref | DOI、题名、作者、出版日期、正式版本 | 对 DOI 论文和版本冲突逐篇查询 |
| OpenAlex | 题录、摘要、来源、撤稿标记 | 对候选题名核验；10 篇关键文献检查 `is_retracted` |
| 出版社/DOI 页面 | 正式发表状态 | ACM、PMLR、Springer、PNAS、NBER、JASSS 等优先 |
| PubMed/PMC | 生命科学/跨学科正式元数据与开放全文 | 核验 PMID 41268053、PMCID PMC12627210 |
| arXiv | 预印本版本、提交/修订日期和摘要 | 只用于明确标注的预印本或正式版本的开放前稿 |
| 机构库 | 补充正式来源发现 | 北京大学机构库帮助发现 PNAS 2026 论文，最终以 Crossref/PNAS DOI 核验 |

深读或读取完整摘要的关键来源：

- Larooij & Törnberg，PMC 开放全文。
- Windrum、Fagiolo & Moneta，JASSS 开放全文。
- Aher、Arriaga & Kalai，PMLR/ICML 正式页面和摘要。
- Park 等、AgentSociety、Mou 等前稿、Seshadri 等，arXiv 原始摘要/版本页。
- Horton 等，NBER 工作论文原始页；正式版本另以 ACM DOI 核验。
- Xie 等，Crossref 收录的 PNAS 摘要和元数据。

## 4. 用户提供的本地全文补充

2026-07-24 盘点 `research/外来补充/transaction_market_papers/`，发现 6 篇 PDF，共 163 页。全部纳入全文补充集；`README_文献说明.txt` **没有作为证据**。处理与阅读记录如下：

| 文献 | 文件/PDF 页数 | 实际读取与核对 | 纳入理由 | 版本处理 |
|---|---:|---|---|---|
| Gode & Sunder 1993 | 20 | PDF 2–6、9–19；市场、ZI 约束、价格、效率、利润、结论 | 识别制度约束与 Agent 智能对市场效率的不同贡献 | 以 JPE 1993 正式版、DOI `10.1086/261868` 计 |
| Cook et al. 1983 | 32 | PDF 2–5、17–30；网络定义、100 人实验、仿真、脆弱性、讨论 | 给出交换网络最小关系条件和结构权力指标 | 以 AJS 1983 正式版、DOI `10.1086/227866` 计 |
| Greif 1989 | 27 | PDF 2–7、11–16、20–27；理论、历史证据、联盟边界、身份、信息流、结论 | 说明声誉的证据、制裁和排斥机制 | 以 JEH 1989 正式版、DOI `10.1017/S0022050700009475` 计 |
| Bolton et al. | 35 | PDF 1–25；理论、三处理、144 人协议、主结果、外部性、结论 | 区分直接关系、公共反馈和市场信任 | 本地为 2003 前稿；书目升级为 *Management Science* 2004 正式版，DOI `10.1287/mnsc.1030.0199` |
| Jia & Yuan 2024 | 6 | 全文 1–6 | 直接检验 LLM 双向拍卖，并暴露基线/重复/指标缺口 | 保持 NeurIPS workshop/arXiv:2409.08357 标注，不冒充正式大会论文 |
| Jiang et al. | 43 | PDF 1–27，并核对附录的实现变体、线上/线下和 session 结果 | 检验货币何时才“必要”，限定钱包的因果解释 | 本地为 Richmond Fed 2023 修订稿；已升级核验 JPE 2024 正式版，DOI `10.1086/730199` |

前三篇是图像扫描件，先逐页渲染，再用 Tesseract OCR 辅助检索；关键数字、表格和结论回到页面图像核对。后三篇使用 `pdftotext -layout` 提取并结合版面检查。OCR/抽取只用于定位，不把识别文本本身当作独立来源。

本轮从正文中提取的是研究设计、处理组、样本、指标、数值结果、作者限定和局限，而不是仅采用摘要或 pitch。形成的跨论文修正包括：配置效率与价格收敛分开；交换边加入替代/条件依赖；声誉拆成双边历史、公共反馈和制裁边界；token 与易货/信用/公共历史比较；LLM 必须与 ZI-U、ZI-C 和启发式基线比较。

## 5. 纳入标准

候选满足以下至少一项，且元数据可从原始/学术来源核验：

1. 直接讨论社会分析单位、关系、微观—宏观机制或生成式解释。
2. 提供 ABM 的最小组件、描述协议、校准或经验验证方法。
3. 研究消费者 Agent、创新扩散、口碑、促销或社会影响机制。
4. 提供规范、互惠、惩罚、声誉或制度演化的理论/实验依据。
5. 实现或评估 LLM Agent 的记忆、规划、合成人群、社会模拟或行为有效性。
6. 解释 token 采用、区块链制度功能或货币社会学与 ABM 的联系。

优先顺序：同行评审原始论文/系统综述 > 正式会议论文 > 高相关工作论文/预印本 > 书籍或研究议程。最终核心集兼顾奠基性研究和 2023–2026 年的新证据。

## 6. 排除与版本替换

| 候选类型/示例 | 处理 | 原因 |
|---|---|---|
| CSDN、道客巴巴、豆丁、原创力文档、智源趋势页 | 排除为证据 | 二次转载、元数据不稳定或无法核验原文 |
| ResearchGate 图页或上传页 | 不作为原始来源 | 可用于发现题名，不能替代出版记录 |
| Injective SDK、链上开发教程 | 排除 | 本轮只做社会科学和模拟方法，不做 SDK 调研 |
| 只出现 “Agent” 但与社会互动无关的论文 | 排除 | 主题不相关 |
| 无法取得全文的中文付费文档 | 排除结论性使用 | 搜索摘要不足以核验方法和发现 |
| Aher 等 arXiv 记录 | 替换为 PMLR/ICML 2023 | 正式同行评审版本优先 |
| Horton 等 NBER 31122 | 主书目改用 ACM EC 2024 | 正式同行评审版本优先；NBER 页面用于核验摘要和 2026 修订状态 |
| Mou 等 arXiv:2412.03563 | 替换为 ACM CSUR 2026 | 正式同行评审版本优先 |
| Tokenomics NBER/SSRN 版本 | 替换为 RFS 正式版本 | 正式期刊版本优先 |
| AgentSociety、Lost in Simulation、货币社会学 ABM | 保留并显式标注预印本 | 对最新工程、风险或研究议程有高直接相关性，但不用于单独支撑强结论 |
| Bolton 本地 2003 前稿 | 读取正文，书目采用 2004 *Management Science* 版 | 正式期刊版本优先；前稿用于可访问的详细方法/结果 |
| Jiang 等 Richmond Fed 2023 修订稿 | 读取正文，书目升级为 JPE 2024 | Crossref 找到正式 DOI `10.1086/730199`；未把工作论文当最终发表状态 |
| Jia & Yuan workshop/arXiv 稿 | 保留为全文补充，不计入正式同行评审论文 | 未核验到 archival conference/期刊 DOI；方法相关但证据强度有限 |

## 7. 筛选结果

- 核心文献：35 篇。
- 背景性补充：1 篇（计算社会科学宣言）。
- 核心同行评审期刊/会议论文：32 篇（91.4%）。
- 核心工作论文/预印本：3 篇（8.6%）。
- 六个主题均有覆盖；LLM 验证部分包含执行日前两个月内的 PNAS 2026 正式论文。
- 结构化理论另列 Giddens 1984 背景专著，不计入论文数量；其书目信息由正式学术书评交叉核验。
- 另有用户提供全文补充 6 篇：5 篇已核验正式期刊版本，1 篇为 workshop/arXiv 稿；为保持原系统检索池可复核性，不把它们追加入“35 篇核心文献”的分母。
- 10 篇关键文献的 OpenAlex 记录未标记撤稿；其余文献完成 DOI/正式来源核验，但未声称完成所有数据库的永久撤稿排查。

## 8. 检索局限

1. 博查对宽泛中文学术查询返回较多文档转载和博客，需要英文机制词和题名级检索才能收敛。
2. 部分出版社阻止自动化读取；这类论文只使用 DOI 元数据、开放摘要或作者/索引页，不推断未读取的细节。
3. 未登录 CNKI、万方或 Web of Science；因此本轮不是这些付费数据库意义上的穷尽式系统综述。
4. 生成式社会模拟发展很快；2026 年预印本的发表状态可能在检索日后变化。
5. 本轮不做引文计量，未报告任何未经核验的引用次数。
6. 本地扫描 PDF 的 OCR 可能误识别字符，因此关键数字均回看页面；OCR 结果不作为引文文本。
7. OpenAlex 在补充文献撤稿复核时返回当日额度用尽；因此只记录 Crossref/出版社未显示更正或撤稿关系，不声称完成跨库撤稿排查。
8. Jiang 等的详细实验记录来自 2023 修订工作论文；本轮核验了 2024 JPE 正式版元数据，但没有逐页比较两个版本的全部表格。

## 9. 可复核路径

复核者可按以下顺序重做：先运行第 2 节的 15 个博查查询；对候选题名用 Crossref/OpenAlex 查 DOI；优先打开 DOI/出版社或 arXiv 原始页；对第 4 节六篇按记录页码回看本地 PDF；用第 5 节标准筛选；在正式版本存在时替换预印本/工作稿；最后分别标注“论文发现、综合判断、MVP 建议”。
