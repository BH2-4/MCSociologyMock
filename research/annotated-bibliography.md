# 注释书目：微型社会、市场实验与 LLM Agent

说明：R01–R06、R08–R36 为 35 篇核心文献；R07 是帮助定位计算社会科学范围的背景文献，不计入核心数量。S01 为背景著作，S02–S07 为用户提供且已读取正文的全文补充，不改变原核心集计数。出版日期优先采用 Crossref/OpenAlex 的首次在线或正式出版日期；来源只提供月份时不补造具体日期。`arXiv-issued DOI` 仅是预印本标识，不表示同行评审。

## A. 社会学基础与传统 ABM

### R01. Manifesto for a Relational Sociology

- 作者：Mustafa Emirbayer。来源：*American Journal of Sociology*（University of Chicago Press）；同行评审理论论文；1997-09-01。DOI/原始页：https://doi.org/10.1086/231209
- 问题与方法：理论性比较实体主义与关系/交易取向，讨论行动者、结构和过程如何被概念化。
- 发现与相关性：社会对象不应被视为先于关系而固定存在；支持把关系和交易事件做成一等状态，而非只把关系写进人物简介。
- 局限与核验：不提供计算模型或参数化方案。题录由 OpenAlex/DOI 核验；OpenAlex 未标记撤稿（2026-07-24）。

### R02. Threshold Models of Collective Behavior

- 作者：Mark Granovetter。来源：*American Journal of Sociology*；同行评审论文；1978-05-01。DOI/原始页：https://doi.org/10.1086/226707
- 问题与方法：用异质行动阈值的数学模型解释群体行为如何逐步展开。
- 发现与相关性：个体倾向相近的群体也可能因阈值排序和前序行动产生不同宏观结果；产品扩散需记录局部曝光、采用阈值与互动顺序。
- 局限与核验：模型高度简化，不能直接代表复杂消费决策。题录由 OpenAlex/DOI 核验。

### R03. From Factors to Actors: Computational Sociology and Agent-Based Modeling

- 作者：Michael W. Macy、Robert Willer。来源：*Annual Review of Sociology*；同行评审综述；2002-07-28。DOI/原始页：https://doi.org/10.1146/annurev.soc.28.110601.141117
- 问题与方法：综述从变量中心模拟转向适应性行动者模型的计算社会学研究。
- 发现与相关性：局部互动可生成扩散、规范、协调和集体行动；网络既塑造互动也被互动改变。它直接支持“Agent + 关系层微观基础”，而非孤立 Agent。
- 局限与核验：以方法论和早期案例为主，不含 LLM。摘要与题录由 OpenAlex/DOI 核验；未标记撤稿。

### R04. Artificial Societies: Multiagent Systems and the Micro-Macro Link in Sociological Theory

- 作者：R. Keith Sawyer。来源：*Sociological Methods & Research*（SAGE）；同行评审论文；2003-02-01。DOI/原始页：https://doi.org/10.1177/0049124102239079
- 问题与方法：概念分析多智能体系统如何处理社会学的微观—宏观连接。
- 发现与相关性：区分微观到宏观涌现、宏观到微观社会因果及其循环；制度和公共环境应作为独立状态反馈给 Agent。
- 局限与核验：不是经验验证研究。摘要与题录由 OpenAlex/DOI 核验；未标记撤稿。

### R05. Agent-Based Computational Models and Generative Social Science

- 作者：Joshua M. Epstein。来源：*Complexity*（Wiley）；同行评审方法论文；1999-05-01。DOI/原始页：https://doi.org/10.1002/(SICI)1099-0526(199905/06)4:5%3C41::AID-CPLX9%3E3.0.CO;2-F
- 问题与方法：论证 ABM 作为“生成式”社会科学方法，与纯归纳和纯演绎方法区分。
- 发现与相关性：通过明确微观规则生成宏观规律可以提供机制性解释；实验数据可帮助选择竞争模型。
- 局限与核验：生成成功只证明机制充分，不证明其必要或真实。摘要与题录由 OpenAlex/DOI 核验。

### R06. Agent-Based Modeling: Methods and Techniques for Simulating Human Systems

- 作者：Eric Bonabeau。来源：*Proceedings of the National Academy of Sciences*；同行评审综述；2002-05-14。DOI/原始页：https://doi.org/10.1073/pnas.082080899
- 问题与方法：介绍 ABM 原理并综述流动、组织、市场和扩散四类应用。
- 发现与相关性：市场和扩散问题适合用异质行动者与局部互动表达，为本项目的市场实验定位提供早期依据。
- 局限与核验：主要展示方法和应用潜力，对严格校准讨论较少。摘要与题录由 OpenAlex/DOI 核验。

### R07（背景）. Manifesto of Computational Social Science

- 作者：Rosaria Conte、Nigel Gilbert、Giulia Bonelli 等。来源：*European Physical Journal Special Topics*；同行评审观点论文；2012-11-01。DOI/原始页：https://doi.org/10.1140/epjst/e2012-01697-8
- 问题与方法：提出计算社会科学的研究议程，强调数字行为数据、复杂系统与政策实验的结合。
- 发现与相关性：支持把社会模拟与经验数据连接，而非只做封闭的“玩具社会”。
- 局限与核验：是研究宣言，不直接回答最小分析单位，故列为背景而非核心。摘要与题录由 OpenAlex/DOI 核验。

### S01（背景著作）. The Constitution of Society: Outline of the Theory of Structuration

- 作者：Anthony Giddens。来源：Polity Press / University of California Press；学术专著；1984。书目信息由同时代 *American Journal of Sociology* 书评核验：https://doi.org/10.1086/228358
- 问题与方法：系统提出结构化理论，以“结构二重性”连接行动与结构；规则和资源既约束实践，也由实践持续再生产。
- 发现与相关性：为制度引擎提供不同于纯自下而上涌现的解释：Agent 行动要调用规则/资源，事件也可维持或改变制度。
- 局限与核验：不是论文、计算模型或经验检验，故不计入 35 篇核心文献，也不用于参数估计。

### R08. Causal Mechanisms in the Social Sciences

- 作者：Peter Hedström、Petri Ylikoski。来源：*Annual Review of Sociology*；同行评审综述；2010-06-01。DOI/原始页：https://doi.org/10.1146/annurev.soc.012809.102632
- 问题与方法：综述社会机制解释、行动理论、中层理论及 ABM 的方法角色。
- 发现与相关性：模型应声明行动机制和跨层因果链；LLM 只能实现受理论约束的决策模块，不能用流畅文本代替机制。
- 局限与核验：不提供市场或 LLM 实证。摘要与题录由 OpenAlex/DOI 核验。

## B. 模型描述、行为规则与验证

### R09. A Standard Protocol for Describing Individual-Based and Agent-Based Models

- 作者：Volker Grimm、Uta Berger、Finn Bastiansen 等。来源：*Ecological Modelling*；同行评审方法论文；2006-09。DOI/原始页：https://doi.org/10.1016/j.ecolmodel.2006.04.023
- 问题与方法：提出 ODD（Overview, Design concepts, Details）模型描述协议。
- 发现与相关性：把目的、实体/状态、过程、设计概念、初始化、输入和子模型分开报告，可防止提示词、规则和环境混成不可复现黑箱。
- 局限与核验：源于生态模型，需要映射到社会/市场对象。题录由 Crossref 核验。

### R10. The ODD Protocol: A Review and First Update

- 作者：Volker Grimm、Uta Berger、Donald L. DeAngelis、J. Gary Polhill、Jarl Giske、Steven F. Railsback。来源：*Ecological Modelling*；同行评审方法论文；2010-09-14。DOI/原始页：https://doi.org/10.1016/j.ecolmodel.2010.08.019
- 问题与方法：回顾 ODD 的应用并更新描述顺序和术语。
- 发现与相关性：标准化报告能改善可读性、复现和模型间比较；MVP 应随代码发布 ODD 式模型说明。
- 局限与核验：协议改善透明度，不自动保证行为效度。题录由 OpenAlex/DOI 核验。

### R11. Empirical Validation of Agent-Based Models: Alternatives and Prospects

- 作者：Paul Windrum、Giorgio Fagiolo、Alessio Moneta。来源：*Journal of Artificial Societies and Social Simulation* 10(2) 8；同行评审论文；2007-03-31。原始全文：https://www.jasss.org/10/2/8.html
- 问题与方法：比较间接校准、Werker–Brenner 和 history-friendly 三类 ABM 经验验证方法。
- 发现与相关性：验证取决于模型目标、理论—数据关系和敏感性分析；ABM 的共同点包括异质性、有限理性、直接网络互动和路径依赖。
- 局限与核验：没有单一程序能解决全部验证问题。JASSS 全文核验；OpenAlex 未标记撤稿。

### R12. A Critical Guide to Empirical Validation of Agent-Based Models in Economics

- 作者：Giorgio Fagiolo、Alessio Moneta、Paul Windrum。来源：*Computational Economics*；同行评审论文；2007-09-03。DOI/原始页：https://doi.org/10.1007/s10614-007-9104-4
- 问题与方法：系统讨论经济 ABM 的校准、模型选择、输出匹配和开放问题。
- 发现与相关性：真实感展示不能替代经验校准；应预先指定目标统计量、敏感性范围和模型比较。
- 局限与核验：早于 LLM，但问题在生成式 ABM 中更严重。题录由 OpenAlex/Crossref 核验。

### R13. Modeling Human Decisions in Coupled Human and Natural Systems: Review of Agent-Based Models

- 作者：Li An。来源：*Ecological Modelling*；同行评审综述；2011-09-07。DOI/原始页：https://doi.org/10.1016/j.ecolmodel.2011.07.010
- 问题与方法：综述 ABM 中人类决策的理论与实现方法。
- 发现与相关性：决策可来自效用、启发式、认知模型、学习或经验规则；选型必须与问题和可用数据匹配。
- 局限与核验：应用域偏人地耦合系统，不能直接给出消费者参数。题录由 OpenAlex/DOI 核验。

## C. 市场、创新扩散和社会影响

### R14. Agent-Based Modeling in Marketing: Guidelines for Rigor

- 作者：William Rand、Roland T. Rust。来源：*International Journal of Research in Marketing*；同行评审方法论文；2011-07-22。DOI/原始页：https://doi.org/10.1016/j.ijresmar.2011.04.002
- 问题与方法：针对营销 ABM 提出建模和报告的严谨性要求。
- 发现与相关性：营销 ABM 必须把理论、数据、实现、验证和可复现报告连接起来；适合作为本项目市场实验质量框架。
- 局限与核验：是通用指南，不证明某一 LLM 消费者模型有效。题录由 OpenAlex/DOI 核验；未标记撤稿。

### R15. Agent-Based Simulation of Innovation Diffusion: A Review

- 作者：Elmar Kiesling、Markus Günther、Christian Stummer、Lea M. Wakolbinger。来源：*Central European Journal of Operations Research*；同行评审综述；首次在线 2011-05-30。DOI/原始页：https://doi.org/10.1007/s10100-011-0210-y
- 问题与方法：系统回顾创新扩散 ABM 的消费者、网络、决策和供给侧建模。
- 发现与相关性：异质消费者、社会网络、沟通渠道和采用决策是扩散模型的核心；支持把产品曝光与关系结构显式化。
- 局限与核验：领域模型的经验校准质量不一。题录由 OpenAlex/DOI 核验。

### R16. Influentials, Networks, and Public Opinion Formation

- 作者：Duncan J. Watts、Peter Sheridan Dodds。来源：*Journal of Consumer Research*；同行评审模拟论文；2007-12。DOI/原始页：https://doi.org/10.1086/518527
- 问题与方法：用多组人际影响模拟检验“少数意见领袖驱动大级联”的假说。
- 发现与相关性：多数条件下，大级联更依赖足够多的易受影响个体，而不是极少数超级影响者；MVP 应比较播种策略而非预设 KOL 最优。
- 局限与核验：结果依赖模型条件，不能被解释为意见领袖永远无效。摘要由 OpenAlex、题录由 Crossref 核验。

### R17. Targeting and Timing Promotional Activities: An Agent-Based Model for the Takeoff of New Products

- 作者：Sebastiano A. Delre、Wander Jager、Tammo H. A. Bijmolt、Marco A. Janssen。来源：*Journal of Business Research*；同行评审论文；2007-03-29。DOI/原始页：https://doi.org/10.1016/j.jbusres.2007.02.002
- 问题与方法：以 ABM 比较新产品起飞阶段的促销目标和时机。
- 发现与相关性：推广效果是消费者异质性、网络传播和干预时机的联合作用；对应本项目的产品投放接口。
- 局限与核验：结论受具体网络和采用规则约束，不能直接移植为现实最优策略。题录由 OpenAlex/DOI 核验。

### R18. Talk of the Network: A Complex Systems Look at the Underlying Process of Word-of-Mouth

- 作者：Jacob Goldenberg、Barak Libai、Eitan Muller。来源：*Marketing Letters*；同行评审论文；2001-08-01。DOI/原始页：https://doi.org/10.1023/A:1011122126881
- 问题与方法：以复杂系统/网络模型研究口碑扩散过程。
- 发现与相关性：口碑是局部网络互动累积出的动态过程，而非单一聚合传播系数；需要记录消息路径和关系边。
- 局限与核验：早期模型简化语言内容和平台机制。题录由 OpenAlex/DOI 核验。

## D. 博弈、规范、互惠和制度

### R19. An Evolutionary Approach to Norms

- 作者：Robert Axelrod。来源：*American Political Science Review*；同行评审模拟论文；1986-12-01。DOI/原始页：https://doi.org/10.2307/1960858
- 问题与方法：用有限理性行动者的演化博弈模拟规范的出现与稳定。
- 发现与相关性：规范可能通过声誉、惩罚和“惩罚不惩罚者”的元规范维持；支持显式的规范与制裁状态机。
- 局限与核验：支付和策略空间高度简化。摘要与题录由 OpenAlex/DOI 核验。

### R20. Collective Action and the Evolution of Social Norms

- 作者：Elinor Ostrom。来源：*Journal of Economic Perspectives*；同行评审论文；2000-08-01。DOI/原始页：https://doi.org/10.1257/jep.14.3.137
- 问题与方法：结合演化论证与案例证据解释社会困境中的合作和规则。
- 发现与相关性：理性利己者、条件合作者和愿意惩罚者可共存；商品、群体和分配规则等情境变量影响合作。
- 局限与核验：不是可直接运行的单一 ABM。摘要与题录由 OpenAlex/DOI 核验。

### R21. Altruistic Punishment in Humans

- 作者：Ernst Fehr、Simon Gächter。来源：*Nature*；同行评审实验论文；2002-01。DOI/原始页：https://doi.org/10.1038/415137a
- 问题与方法：公共品实验检验参与者是否愿意付费惩罚搭便车者，以及惩罚如何影响合作。
- 发现与相关性：有成本的惩罚可在没有直接未来收益时支持合作；可作为 Agent 惩罚倾向和公共品机制的微观校准目标。
- 局限与核验：实验环境与市场交易不同，跨文化和情境参数需重新校准。题录由 OpenAlex/DOI 核验。

### R22. Evolution of Indirect Reciprocity

- 作者：Martin A. Nowak、Karl Sigmund。来源：*Nature*；同行评审综述/理论论文；2005-10。DOI/原始页：https://doi.org/10.1038/nature04131
- 问题与方法：综述并形式化声誉介导的间接互惠机制。
- 发现与相关性：行动者会依据他人的声誉而帮助或拒绝，声誉信息质量和更新规则决定合作；支持关系图中的公开/私有声誉。
- 局限与核验：简化的评分和互动规则不等于现实信任。题录由 OpenAlex/DOI 核验。

### R23. The Evolution of Social Norms

- 作者：H. Peyton Young。来源：*Annual Review of Economics*；同行评审综述；2015-08-01。DOI/原始页：https://doi.org/10.1146/annurev-economics-080614-115322
- 问题与方法：综述演化博弈、学习与社会规范形成理论。
- 发现与相关性：规范可由局部互动、适应和路径依赖形成；MVP 可固定规范，后续版本再研究规则内生演化。
- 局限与核验：综述涵盖抽象模型，未给出 LLM Agent 的验证方案。题录由 Crossref/DOI 核验。

## E. LLM Agent 与生成式社会模拟

### R24. Generative Agents: Interactive Simulacra of Human Behavior

- 作者：Joon Sung Park、Joseph C. O’Brien、Carrie J. Cai、Meredith Ringel Morris、Percy Liang、Michael S. Bernstein。来源：ACM UIST 2023；同行评审会议论文；2023-10-20。DOI/原始页：https://doi.org/10.1145/3586183.3606763
- 问题与方法：在 25 Agent 小镇中实现事件记忆、动态检索、反思和规划，并做组件消融与可信感评估。
- 发现与相关性：观察、规划和反思均提升行为可信感，且局部信息可产生聚会传播与协调；为 Agent 内部架构提供原型。
- 局限与核验：评估的是 believability，不是人口代表性、市场预测或制度效度。arXiv 摘要与 Crossref/OpenAlex 题录核验；未标记撤稿。

### R25. Using Large Language Models to Simulate Multiple Humans and Replicate Human Subject Studies

- 作者：Gati V. Aher、Rosa I. Arriaga、Adam Tauman Kalai。来源：ICML 2023，PMLR 202:337–371；同行评审会议论文；2023-07-23 至 07-29。原始页：https://proceedings.mlr.press/v202/aher23a.html
- 问题与方法：提出 Turing Experiment，模拟代表性受试者集合并重现最后通牒博弈、花园路径句、Milgram 实验和群体智慧实验。
- 发现与相关性：部分经典效应可重现，但群体智慧出现 “hyper-accuracy distortion”；支持以人类实验做微观基准，也证明“看似更准”可能是偏差。
- 局限与核验：LLM 可能受训练语料污染，少量经典任务不能证明普遍人类等价性。PMLR 全文页核验；OpenAlex 未标记撤稿。

### R26. Out of One, Many: Using Language Models to Simulate Human Samples

- 作者：Lisa P. Argyle、Ethan C. Busby、Nancy Fulda、Joshua R. Gubler、Christopher Rytting、David Wingate。来源：*Political Analysis*；同行评审论文；2023-02-21。DOI/原始页：https://doi.org/10.1017/pan.2023.2
- 问题与方法：向语言模型提供社会人口背景，比较合成回答与真实人群的调查响应模式。
- 发现与相关性：画像条件化能产生一定的群体层“算法保真度”；支持从目标人口联合分布生成画像，而不是手写少数角色。
- 局限与核验：不能由条件平均相似推出个体预测、少数群体准确或因果效度。题录由 Crossref/OpenAlex 核验；未标记撤稿。

### R27. Large Language Models as Simulated Economic Agents: What Can We Learn from Homo Silicus?

- 作者：Apostolos Filippas、John J. Horton、Benjamin S. Manning。来源：ACM Conference on Economics and Computation 2024；同行评审会议论文；2024-07-08。DOI/原始页：https://doi.org/10.1145/3670865.3673513
- 问题与方法：为 LLM 赋予禀赋、信息和偏好，比较其在经典经济情境中的定性行为。
- 发现与相关性：部分实验与原研究方向相近，差异可用于生成新假设；支持把 LLM 作为可压力测试的行为模型。
- 局限与核验：作者明确讨论概念问题；NBER 工作论文 31122 于 2026-02 修订，但不能把定性相似当作现实预测。ACM/Crossref 与 NBER 原始页核验。

### R28. Can AI Language Models Replace Human Participants?

- 作者：Danica Dillion、Niket Tandon、Yuling Gu、Kurt Gray。来源：*Trends in Cognitive Sciences*；同行评审观点/综述；2023-07。DOI/原始页：https://doi.org/10.1016/j.tics.2023.04.008
- 问题与方法：评估语言模型作为行为科学参与者代理的能力与方法风险。
- 发现与相关性：LLM 可辅助先导研究与假设探索，但其训练来源、代表性和系统性偏差限制替代人类参与者。
- 局限与核验：观点性文章，不是多 Agent 市场实验。题录由 Crossref 核验。

### R29. Validation Is the Central Challenge for Generative Social Simulation

- 作者：Maik Larooij、Petter Törnberg。来源：*Artificial Intelligence Review* 59(1):15；同行评审系统综述；首次在线 2025-11-18，卷期年份 2026。DOI/原始全文：https://doi.org/10.1007/s10462-025-11412-6 ，PMC：https://pmc.ncbi.nlm.nih.gov/articles/PMC12627210/
- 问题与方法：系统回顾生成式 ABM 的应用与验证实践，并按模型目标评价其操作效度。
- 发现与相关性：LLM 的黑箱、随机和文化偏差可能加剧而非解决 ABM 验证；不少研究依赖表面效度或与机制联系松散的结果指标。
- 局限与核验：领域变化很快，纳入研究受检索截止期影响。PMC 全文、PubMed、Crossref、OpenAlex 核验；未标记撤稿。

### R30. AgentSociety: Large-Scale Simulation of LLM-Driven Generative Agents Advances Understanding of Human Behaviors and Society

- 作者：Jinghua Piao、Yuwei Yan、Jun Zhang、Nian Li 等 16 人。来源：arXiv:2502.08691；**预印本**；v1 2025-02-12，v2 2026-04-10。原始页：https://arxiv.org/abs/2502.08691
- 问题与方法：构建 LLM Agent、社会环境和大规模引擎，报告超过 1 万 Agent、500 万次互动及五类社会实验。
- 发现与相关性：展示大规模环境、干预、问卷/访谈和社会指标的工程组合，可作为后续扩展参考。
- 局限与核验：截至检索日未核验到正式同行评审版本；论文自身的现实对齐主张不能替代独立验证。arXiv 原始记录核验。

### R31. From Individual to Society: A Survey on Social Simulation Driven by Large Language Model-Based Agents

- 作者：Xinyi Mou、Xuanwen Ding、Qi He、Liang Wang、Jingcong Liang、Xinnong Zhang、Libo Sun、Jiayu Lin、Jie Zhou、Xuanjing Huang、Zhongyu Wei。来源：*ACM Computing Surveys*；同行评审综述；2026-04-17。DOI/原始页：https://doi.org/10.1145/3800683
- 问题与方法：把研究分为个体模拟、场景模拟和社会模拟，综述架构、环境、目标、数据集和评估。
- 发现与相关性：社会模拟需要从个体表示扩展到环境、互动与社会级评价；支持本报告的分层架构。
- 局限与核验：综述归纳组件，不证明任一系统具备市场外部效度。ACM/Crossref 与 arXiv:2412.03563 原始记录核验。

### R32. Evaluating the Statistical Realism of LLM-Generated Social Science Data

- 作者：Yueqi Xie、Lemeng Liang、Shuzhen Li、Yifu Lu、Zhiwen Xiao、Mengdi Shi、Junming Huang、Mengdi Wang、Yu Xie。来源：*Proceedings of the National Academy of Sciences*；同行评审论文；2026-05-08。DOI/原始页：https://doi.org/10.1073/pnas.2538145123
- 问题与方法：提出 SSDataBench，用七个数据集检验单变量分布、双变量关联、多变量预测、生命事件序列及序列—协变量关联。
- 发现与相关性：当前 LLM 在稀疏条件下会把现实异质性压缩为较简单的类型结构；领域训练可能改善总体统计真实性。
- 局限与核验：评估合成社会数据，不直接检验多 Agent 互动和市场因果。Crossref 摘要/题录和北京大学机构库记录核验。

### R33. Lost in Simulation: LLM-Simulated Users Are Unreliable Proxies for Human Users in Agentic Evaluations

- 作者：Preethi Seshadri、Samuel Cahyawijaya、Ayomide Odumakinde、Sameer Singh、Seraphina Goldfarb-Tarrant。来源：arXiv:2601.17087；**预印本**；v1 2026-01-23，v2 2026-01-28。原始页：https://arxiv.org/abs/2601.17087
- 问题与方法：以美国、印度、肯尼亚和尼日利亚参与者比较真实用户与 LLM 模拟用户在零售 Agent 任务中的评估。
- 发现与相关性：不同用户模型使成功率相差最高约 9 个百分点；模拟用户出现难度校准误差、语言/群体差异和不同对话伪影。
- 局限与核验：聚焦 Agent 评测而非社会市场模拟，且尚未核验同行评审版本。arXiv 原始摘要核验。

## F. 区块链、token economy 与货币

### R34. Tokenomics: Dynamic Adoption and Valuation

- 作者：Lin William Cong、Ye Li、Neng Wang。来源：*Review of Financial Studies*；同行评审理论论文；首次在线 2020-08-11。DOI/原始页：https://doi.org/10.1093/rfs/hhaa089
- 问题与方法：建立 token 采用、平台增长、用户效用、融资与估值的动态模型。
- 发现与相关性：token 价格、采用与平台激励存在内生反馈；MVP 不应把 token 当作中性的计价单位，而应区分资产效用、奖励和投机反馈。
- 局限与核验：理论均衡模型不验证 LLM Agent 的消费行为。正式期刊版本由 Crossref 核验；OpenAlex 撤稿检查匹配到工作论文版本，未见撤稿标记。

### R35. Blockchains and the Economic Institutions of Capitalism

- 作者：Sinclair Davidson、Primavera De Filippi、Jason Potts。来源：*Journal of Institutional Economics*；同行评审理论论文；2018-01-18。DOI/原始页：https://doi.org/10.1017/S1744137417000200
- 问题与方法：从新制度经济学解释区块链作为协调、治理和产权技术的作用。
- 发现与相关性：区块链的研究价值在于改变验证、协调和资产控制的制度安排；支持将链上结算视作制度层而非 Agent 心理层。
- 局限与核验：不提供 Agent 模拟或 Injective 特定结论。题录由 OpenAlex/Crossref 核验。

### R36. Agent-Based Modeling and the Sociology of Money: Some Suggestions for Refining Monetary Theory Using Social Simulation

- 作者：Eduardo Coltre Ferraciolli、Tanya V. Araújo。来源：arXiv:2506.22318；**预印本**；2025-06-27。原始页：https://arxiv.org/abs/2506.22318
- 问题与方法：比较货币的经济学/社会学理论与“货币涌现”ABM，提出连接社会理论和形式模拟的研究议程。
- 发现与相关性：货币不仅是交换媒介，也是连接微观行动和宏观制度的社会机制；钱包余额不能替代对信任、接受性和制度执行的建模。
- 局限与核验：是综述性预印本，未提供经同行评审的实现或验证。arXiv 原始记录与博查候选记录核验。

## G. 用户提供的交易与市场机制全文补充

### S02. Allocative Efficiency of Markets with Zero-Intelligence Traders: Market as a Partial Substitute for Individual Rationality

- 作者与来源：Dhananjay K. Gode、Shyam Sunder；*Journal of Political Economy* 101(1):119–137；同行评审实验/仿真论文；正式出版 1993-02。DOI/原始页：https://doi.org/10.1086/261868
- 本地全文：`research/外来补充/transaction_market_papers/02_Gode_Sunder_1993_Zero_Intelligence_Traders.pdf`。使用 PDF 页 2–6、9–19，覆盖市场设计、ZI-U/ZI-C 定义、价格、效率、利润分布和结论；扫描页经 OCR 后与页面图像核对。
- 问题与方法：五种供需结构的连续双向拍卖；ZI 市场各 12 名交易者（6 买、6 卖），对应的人类场次在市场 1–2 各多一名买方、市场 3–4 各多一名卖方。比较人类、随机且无结算约束的 ZI-U、以及买方不高于价值/卖方不低于成本的 ZI-C。
- 主要发现：五市场平均配置效率 ZI-C 为 98.7%，人类为 97.9%；ZI-U 随市场结构为 48.8%–90.0%。但 ZI-C 价格收敛慢于人类、价格更波动，个体利润离散也更大。
- 与项目相关性：证明预算/不亏损约束和拍卖制度本身可产生高聚合效率；MVP 必须把约束交给确定性引擎，并以 ZI-U、ZI-C 作为 LLM 的强制基线。配置效率不能替代价格稳定、分配或学习指标。
- 局限与核验：只研究特定双向拍卖和诱导价值环境，不能推出“市场不需要智能”或随机 Agent 能复制人类市场。Crossref 核验题名、作者、卷期、页码、DOI；未在 Crossref 记录看到更正/撤稿关系。本轮 OpenAlex 撤稿查询因额度限制未完成。

### S03. The Distribution of Power in Exchange Networks: Theory and Experimental Results

- 作者与来源：Karen S. Cook、Richard M. Emerson、Mary R. Gillmore、Toshio Yamagishi；*American Journal of Sociology* 89(2):275–305；同行评审理论、实验与仿真论文；正式出版 1983-09。DOI/原始页：https://doi.org/10.1086/227866
- 本地全文：`research/外来补充/transaction_market_papers/03_Cook_Emerson_et_al_1983_Power_in_Exchange_Networks.pdf`。使用 PDF 页 2–5、17–30，覆盖概念定义、实验、仿真、脆弱性指标、讨论和局限；扫描页经 OCR/图像核对。
- 问题与方法：检验交换网络的位置权力。实验包含 100 名大学生（50 男、50 女）、五人负连接网络、27 个 180 秒议价期且每期每人最多一笔交易；仿真扩展至 5/7/10/13 个行动者，每种网络 50 次重复、54 期。
- 主要发现：权力—依赖预测在实验中几乎全部得到支持，在仿真中全部得到支持；普通接近/中介中心性不能解释这些负连接网络的位置权力。由移除节点导致的最大流减少更接近结构依赖；行动者无需知道全网，结构仍能分配剩余和权力。
- 与项目相关性：最小交换网络不是任意共享节点的两条边，而是交换之间存在条件依赖。关系边应记录资源、替代性、正/负连接、容量和排他性，并以议价剩余、替代伙伴与节点移除反事实度量权力。
- 局限与核验：实验网络高度风格化且主要为负连接；作者明确提醒外部效度，并把正连接/混合网络留待后续。Crossref 核验正式元数据；未见 Crossref 更正/撤稿关系，OpenAlex 检查因额度限制未完成。

### S04. Reputation and Coalitions in Medieval Trade: Evidence on the Maghribi Traders

- 作者与来源：Avner Greif；*The Journal of Economic History* 49(4):857–882；同行评审历史制度分析论文；正式出版 1989-12。DOI/原始页：https://doi.org/10.1017/S0022050700009475
- 本地全文：`research/外来补充/transaction_market_papers/04_Greif_1989_Reputation_and_Coalitions_in_Medieval_Trade.pdf`。使用 PDF 页 2–7、11–16、20–27，覆盖理论机制、文书证据、联盟边界、信息流、身份和结论；扫描页经 OCR/图像核对。
- 问题与方法：以契约/声誉理论解释 11 世纪地中海远距离贸易，并使用涉及 Maghribi 商人的 1,000 余份开罗 Geniza 文书作为历史证据，研究信息不对称和法律执行有限时的海外代理关系。
- 主要发现：联盟通过监测、商业通信中的低成本信息、未来雇佣溢价和集体排斥把过去行为连接到未来收益，从而降低代理成本。相同机制也限定成员边界、强化群体身份，并形成联盟内信任与对外分割。
- 与项目相关性：声誉不是无来源分数；至少需要身份持续、可核查证据/见证网络、信息传播范围、制裁可达性和未来机会损失。还必须观察排斥、跨群体成交和市场分割，而不能只报告“信任提高”。
- 局限与核验：历史材料与理论解释不能直接给出现代数字市场参数；作者明确表示该制度的普遍程度和其他非市场制度仍待比较研究。Crossref/Cambridge 元数据和摘要核验；未见 Crossref 更正/撤稿关系，OpenAlex 检查因额度限制未完成。

### S05. How Effective Are Electronic Reputation Mechanisms? An Experimental Investigation

- 作者与来源：Gary E. Bolton、Elena Katok、Axel Ockenfels；*Management Science* 50(11):1587–1602；同行评审实验论文；正式出版 2004-11。DOI/原始页：https://doi.org/10.1287/mnsc.1030.0199
- 本地全文：`research/外来补充/transaction_market_papers/05_Bolton_Katok_Ockenfels_2003_Electronic_Reputation_Mechanisms.pdf`。该文件为正式发表前稿（文件名标作 2003）；使用 PDF 页 1–25，覆盖理论、处理组、实验协议、主结果、反馈外部性和结论。正式版本状态另以 INFORMS/Crossref 核验。
- 问题与方法：144 名 Penn State 学生，三个市场各 3 个 session、每 session 16 人、30 轮。陌生人市场随机一次匹配且无历史；反馈市场保持随机匹配但展示卖方真实发货历史；伙伴市场固定同一买卖双方并展示同类历史。结果为效率、信任（购买）和可信行为（条件发货）。
- 主要发现：三项结果均为陌生人 < 反馈 < 伙伴；反馈效率为陌生人 2.8 倍，伙伴为反馈 1.8 倍。相同信息内容没有使间接互惠达到直接关系的效果；负面/最近经验权重更强，单次坏经历会侵蚀全市场信任。
- 与项目相关性：应分开双边历史、公开声誉和市场层信任，保留时效与负面非对称权重。钱包身份持续可减少重置/洗白，却不解决反馈生产和声誉外部性；应实验比较固定伙伴与匿名匹配。
- 局限与核验：实验自动生成真实反馈，排除了现实中的自愿反馈不足、噪声、操纵和身份重置，因此可能高估声誉系统。固定价格和学生样本限制外推。Crossref/INFORMS 核验正式元数据；未见 Crossref 更正/撤稿关系，OpenAlex 检查因额度限制未完成。

### S06. An Experimental Study of Competitive Market Behavior Through LLMs

- 作者与来源：Jingru Jia、Zehua Yuan；NeurIPS 2024 Workshop on Behavioral Machine Learning；arXiv:2409.08357，v1 2024-09-12，v2 2024-11-01；**workshop/arXiv 稿，未核验到具有 DOI 的正式大会论文，不能按 archival conference 同行评审论文计数**。原始页：https://arxiv.org/abs/2409.08357
- 本地全文：`research/外来补充/transaction_market_papers/06_Jia_Yuan_2024_Competitive_Market_Behavior_Through_LLMs.pdf`；完整阅读 PDF 1–6 页。
- 问题与方法：22 个彼此分离的 ChatGPT-4.0 会话（11 买、11 卖）参与五轮双向拍卖。每轮保留核心指令，后续提示只更新上一笔交易信息；随机选择会话报价，三次 final call 后结束该轮。
- 主要发现：理论价格为 2，五轮成交均价为 2.04、2.20、2.11、2.12、2.02；理论数量均为 6，实际为 6、5、6、6、6。作者报告的收敛系数为 4.17、20.00、11.33、11.83、2.67，据此认为没有稳定收敛趋势。
- 与项目相关性：提示需要比较“仅上一笔”与完整/有界历史，报告配置效率、价格波动、收敛、剩余分布和策略适应，并加入 ZI-C、启发式和人类基线。
- 局限与核验：论文没有清楚报告独立市场重复、本研究内人类对照、配置效率或统计检验；五轮价格接近理论值、数量近乎预测值，不能支撑“LLM 一般不能达到市场均衡”。关于 LLM 无情绪偏差及高精度预测的表述没有被实验识别。arXiv 元数据和全文核验；未发现正式期刊/会议 DOI。

### S07. Is Money Essential? An Experimental Approach

- 作者与来源：Janet Hua Jiang、Peter Norman、Daniela Puzzello、Bruno Sultanum、Randall Wright；*Journal of Political Economy* 132(9):2972–2998；同行评审理论与实验论文；正式出版 2024-09-01。DOI/原始页：https://doi.org/10.1086/730199
- 本地全文：`research/外来补充/transaction_market_papers/07_Norman_et_al_2023_Is_Money_Essential_Experimental_Approach.pdf`，为 Federal Reserve Bank of Richmond WP 21-12R 的 2023-06 修订稿（工作论文 DOI：https://doi.org/10.21144/wp21-12）。使用 PDF 页 1–27，并核对附录中的实现变体、线上/线下与 session 结果；正式期刊版元数据另经 Crossref 核验。
- 问题与方法：用有限期货币模型检验货币“必要性”，即有货币时是否存在无货币不可激励实现的更优结果。主设计含允许货币均衡的 Model M、不允许货币均衡的 Model N、有/无货币及有/无策略建议；主要处理各 4 个线上 session，另有 2 个稳健性 session，共 312 名学生、每人 15 轮。
- 主要发现：Model M 中，货币显著提高产出/福利；无建议时产出约 52%，有激励相容建议时约 62%，无货币条件则在早期后下降。Model N 的货币使用较低且随经验下降；改变重复小组/角色持续的实现，可把同类条件的平均产出从 0.35 提高到 0.50。SVO 未稳定解释偏离，退出调查显示策略预期、助人、token 本身偏好和错误等多种原因。
- 与项目相关性：token 的效果必须归因于特定摩擦，并与易货、赠与/信用、公共历史和有限承诺条件比较。策略提示本身是实验干预；等待时间、匹配和角色持续可能泄露信息或制造重复博弈。链上钱包提供可审计转移，但不能证明货币必要。
- 局限与核验：本地详细结果来自 2023 工作论文全文；虽已核验 2024 JPE 正式版本的题名、作者、卷期、页码和 DOI，本轮未逐页比对两个版本的全部表格。实验 token 明示无内在价值且不可跨局延续，不能直接外推到真实链上资产。Crossref 未显示更正/撤稿关系；OpenAlex 检查因当日额度限制未完成。

## 核验状态汇总

- 35 篇核心文献中，32 篇有正式同行评审期刊/会议版本，3 篇为明确标注的预印本；同行评审比例 91.4%。R07 是额外背景文献。
- 10 篇关键文献（R01、R03、R04、R11、R14、R24-R26、R29、R34 的对应记录）于 2026-07-24 查询 OpenAlex，均未标记 `is_retracted`；这不等于永久性撤稿保证。
- R25 的正式版本以 PMLR/ICML 为准；R27 以 ACM EC 2024 为正式版本，NBER 31122 为可更新工作论文；R31 已由 arXiv 版本升级为 ACM Computing Surveys 2026 正式版本。
- R30、R33、R36 的结论只按预印本强度使用；没有用搜索摘要、CSDN、ResearchGate 图页或文档转载页支撑核心论断。
- S02–S07 均依据本地 PDF 正文记录方法、结果和局限；目录中的 `README_文献说明.txt` 只用于文件盘点，没有作为证据来源。S02–S05、S07 已核验正式期刊版本，S06 保持 workshop/arXiv 标注。
