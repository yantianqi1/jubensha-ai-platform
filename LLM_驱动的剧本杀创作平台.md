# **LLM驱动的线上剧本杀（Jubensha）平台架构与全栈实现方案深度调研报告**

## **引言**

在当前的数字娱乐产业中，传统的静态、由开发者预先设定的游戏环境正在向动态的、用户生成内容（UGC）以及人工智能合成的生态系统发生范式转变。在这一演变过程中，“剧本杀”（Jubensha）的数字化和自动化是一项极具挑战性的工程。剧本杀作为一种高度依赖剧本叙事和多人互动的逻辑推理游戏，要求玩家在信息不完全甚至存在欺骗性信息的情况下，梳理复杂的故事线并进行多跳逻辑推理 1。

构建一个高度整合的互联网线上剧本杀平台，使其能够利用大型语言模型（LLM）自动化生成剧本、管理游戏流程并呈现精美的Web前端界面，需要一套极其严密的系统架构。该平台不仅需要根据用户输入的关键词动态创作出逻辑严密、剧情吸引人的剧本，还必须自动调用图像生成模型（如GPT-image-2或DALL-E 3）生成剧本封面、背景图及角色立绘，并确保视觉特征的一致性 4。同时，平台需要支持单人模式（玩家与AI驱动的NPC互动）和多人模式（实时匹配与玩家协作），并为每一个独立的剧本提供独一无二的动态UI面板和专属进入入口 6。

本报告将针对上述需求，提供一份详尽的、专家级的技术架构蓝图与实现方案。分析范围涵盖多智能体剧本创作管线、AI视觉资产生成工作流、游戏逻辑与状态管理、后端LLM路由基建、实时匹配系统，以及基于生成式UI（Generative UI）的独立界面呈现方案。

## **1\. 核心剧本创作机制与多智能体工作流**

要实现“用户给出关键词，LLM创作多样化且符合剧本杀要求的吸引人剧情”，依赖单一的LLM提示词输出是完全不可行的。单一提示词往往会导致逻辑漏洞、角色动机单薄以及线索链条断裂 9。为确保剧本的高质量与可玩性，系统架构必须采用协同的多智能体（Multi-Agent）框架，将复杂的创作过程拆解为多个专业的子任务 1。

### **1.1 创作节点与智能体职责划分**

在创作管线中，推荐采用具有强大长文本上下文推理能力的模型（如Gemini 2.5 Pro）作为核心引擎 12。系统根据用户或管理员在“创作模板”中输入的关键词（例如：“赛博朋克”、“企业间谍”、“密室毒杀”），调度多个专门的智能体协同工作。这些智能体通过共享的上下文内存进行交互，逐步构建出完整的剧本杀数据结构 11。

| 智能体名称 | 核心职责与处理逻辑 | 预期输出与剧本杀要素关联 |
| :---- | :---- | :---- |
| **大纲智能体 (OutlineAgent)** | 解析用户关键词，构建整体叙事框架、案发当日的时间线、世界观背景设定，并确立各角色的隐藏动机与秘密 11。 | 生成剧本的骨架，确保故事的宏大性与基础逻辑连贯。 |
| **角色智能体 (CharacterAgent)** | 将大纲细化为具体的人物剧本，以第一人称视角撰写角色的生平、行动轨迹。特别需要为凶手设定作案手法与伪装意图，并为无辜者设定可疑的“红鲱鱼”秘密 11。 | 生成供玩家阅读的角色专属剧本（Private Info），支撑玩家的沉浸式扮演。 |
| **线索智能体 (ClueAgent)** | 设计多模态的证据矩阵。不仅生成文本线索描述，还会提炼出供生图模型使用的提示词，确保线索能够支持逻辑推演而不至于过早暴露真凶 11。 | 产出现场搜证环节所需的物品卡、尸检报告和背景提示词。 |
| **质检智能体 (CriticAgent / QaAgent)** | 作为质量控制中枢，审查生成的剧本在剧情复杂度、难度、行为一致性及逻辑合理性方面是否达标。通过模拟生成多跳推理问答（Multi-hop QA）来验证剧本的“可解性” 11。 | 若发现逻辑死胡同或剧情平淡，立即将数据打回对应智能体进行自我修正（Self-Correction）。 |

### **1.2 结构化数据模型与JSON Schema生成**

为了使Web线上应用能够完美解析并展示剧本，LLM的输出不能是一篇纯文本，而必须被严格约束为标准化的JSON格式 5。在此架构中，LLM充当了游戏引擎的数据编译器。剧本创作Agent在完成剧情构建后，需将其分割成特定的段落，并填充到预设的JSON Schema中 16。

数据模型包含顶层属性如剧本名称、简介、标签，以及嵌套的数组对象，例如角色列表（包含公开信息与私密剧本）、时间线节点、线索库以及分幕剧情（Act 1, Act 2...）。通过在提示词中强制规定输出格式，后端系统可以在接收到LLM响应后，直接将JSON数据反序列化并存入数据库，从而实现新剧本随时可以通过专属入口发布到展示框中 5。

### **1.3 针对不完全信息与欺骗性推理的模型微调**

剧本杀的核心乐趣在于信息的不对称与角色间的欺骗。标准的基础大模型在扮演嫌疑人时，常常表现出过度的“顺从性”（Sycophancy），在玩家的盘问下轻易泄露核心秘密 17。为使AI创作的剧情及后续的AI NPC能够符合剧本杀的对抗性要求，需要引入两阶段的智能体监督训练策略。

第一阶段为监督微调（SFT），利用多智能体框架生成的包含不确定性和欺骗行为的高质量逻辑链数据进行微调 2。第二阶段采用基于群体相对策略优化（GRPO）的强化学习，利用评分智能体（ScoreAgent）作为裁判，对模型在保持角色设定、有效运用多模态线索进行多跳推理以及抗欺骗理解方面的表现给予奖励 1。这一机制确保了平台产出的剧本不仅“文笔好”，而且在逻辑对抗层面具备真正的游戏性。

## **2\. 自动化视觉资产生成管线**

一个高度整合的互联网剧本平台必须具备极强的视觉表现力。系统需要接入外部生图大模型（如GPT-image-2、DALL-E 3或SDXL），以自动化生成剧本封面照、角色立绘、角色设定图和场景背景图 1。这其中的核心技术难点在于如何克服生成式AI的“特征漂移”（Identity Drift）问题，即确保同一个角色在不同的生成批次、不同的场景中保持面部、服装和整体风格的绝对一致性 4。

### **2.1 LLM到图像API的提示词转译工作流**

单纯的文本到图像（Text-to-Image）提示词无法胜任复杂的平台资产生成需求。平台需要部署一个专门的视觉描述转译智能体。当剧本主体创作完成后，该智能体会读取JSON中的角色和场景设定，将其转化为对生图模型友好的结构化提示词。

转译智能体会被注入全局的美学锚点（Style Anchors），例如“1920年代黑色电影风格”、“二次元赛博朋克”、“无文本渲染”等，以保证同一个剧本内的所有视觉资产在画风上高度统一 4。这些提示词随后通过自动化脚本或后台Agent直接调用生图API，获取生成的图像URL，并将这些链接无缝嵌入到剧本的JSON结构中 20。

### **2.2 角色一致性与高级条件控制技术**

为了确保生成的角色立绘和剧情CG在整个游戏中保持一致，系统不能在每次需要该角色图片时都重新进行纯文本生成，而应建立基于图像条件（Image-Based Conditioning）的生成管线 21。

| 技术方案 | 实现原理与应用场景 | 平台集成优势 |
| :---- | :---- | :---- |
| **主参考图生成 (Master Reference)** | LLM生成详尽的中性特征提示词（如多角度角色三视图），由基础模型生成一张被标记为“圣杯”的基准参考图 23。 | 为后续所有涉及该角色的生成任务提供视觉锚点，消除单纯文本描述带来的歧义。 |
| **IPAdapter 与 ControlNet 结合** | 提取主参考图的面部和风格特征（而非像素）作为强条件输入给生图模型；结合ControlNet控制人物姿态与构图深度 21。 | 在生成不同剧情照时，强制AI复制相同的五官与特征，大幅减少特征漂移现象，适用于动态场景。 |
| **动态 LoRA 训练 (Low-Rank Adaptation)** | 后台收集基于IPAdapter生成的15-20张高质量角色图，自动触发轻量级的LoRA微调训练 21。 | 针对被高频游写的热门剧本，生成专属的小型权重文件。加载该LoRA后，只需极简提示词即可完美复现角色，降低API调用复杂度和长期成本。 |

通过这一系列自动化的高级视觉管线，用户或管理员在平台创作模版中只需输入寥寥数语，系统便能全自动地产出媲美专业画师绘制的全套剧本杀视觉资产。

## **3\. 前端架构与剧本专属动态UI展现**

关于“最终使用什么样的形式呈现处每一个剧本，每个剧本游戏、美化面板、游戏界面都应该是独立的不同的界面”这一核心诉求，传统的大型单体（Monolithic）前端架构或简单的iframe嵌套方案无法满足。iframe存在响应式设计极差、跨域通信困难（postMessage繁琐）以及性能开销过大的问题 26。为了在Web线上应用中实现各剧本界面的绝对隔离与高度自定义，需要结合微前端架构与生成式UI技术。

### **3.1 微前端（Micro-Frontends）与模块联邦**

平台前端应采用基于模块联邦（Module Federation，如Webpack或Vite实现）的微前端架构 28。在这种架构下，平台存在一个“宿主应用”（Shell App），负责处理用户登录、大厅展示框（Showcase）的剧本列表展示、路由以及全局的WebSocket网络连接 28。

当用户从展示框中选择并进入一个具体的剧本入口时，宿主应用会在运行时（Runtime）动态加载该剧本专属的前端模块 28。这意味着，一个古代武侠剧本和一个科幻太空剧本可以拥有完全不同的代码逻辑、UI组件甚至交互方式，它们在逻辑上相互独立，由不同的模板甚至不同的开发流程生成，但在用户体验上却是在同一个浏览器页面中无缝切换 29。这种强边界的隔离机制不仅保护了系统的稳定性，防止了状态污染，还为未来的UGC无限扩展奠定了基础 31。

### **3.2 基于CSS变量的动态主题隔离**

为实现界面的“美化”，系统需支持动态的主题切换。当LLM在创作剧本时，不仅生成剧情数据，还会生成一套对应的设计令牌（Design Tokens），包含色彩规范、排版字体、阴影深度等 32。

通过结合Tailwind CSS等现代样式框架，这些设计令牌会被转化为CSS自定义属性（CSS Variables），并通过特定的数据属性（Data Attributes）或运行时脚本注入到该剧本挂载的DOM节点上 33。这种方式确保了主题的隔离性——科幻剧本的高对比度霓虹色变量仅在其独立的容器内生效，绝不会泄漏并影响到外层的平台大厅或其他玩家的界面 35。

### **3.3 生成式UI（Generative UI）的革命性呈现**

传统的AI应用通常采用聊天机器人式的“文本墙”（Wall of Text）来呈现内容，这在游戏场景中极易引发阅读疲劳 36。本项目应采用前沿的生成式UI（Generative UI）范式 37。

在生成式UI架构中，LLM不直接输出Markdown文本，而是根据游戏当前的上下文输出结构化的组件指令 39。前端通过诸如Vercel AI SDK或类似的React服务端渲染技术，将这些指令实时映射为可交互的UI组件 40。例如，当玩家在单人模式下对某个人物进行搜身时，AI不仅返回描述，还会直接在界面上渲染出一个动态的“物品清单面板”或“线索拼图板” 37。这种由LLM根据剧本特性实时组装预制UI原子组件（Atoms）的方法，使得每一个剧本都能呈现出完全不同的游戏形式与交互面板，完美契合了平台对多样化展现形式的极致追求 36。

## **4\. 游戏逻辑与单/多人模式状态管理**

线上剧本杀的运行逻辑需要覆盖从阅读剧本、自我介绍、线索搜证、多轮公聊/私聊到最终投票复盘的全生命周期 42。针对单人模式与多人模式的不同运行机制，系统后端必须提供两套截然不同但高度兼容的状态管理方案。

### **4.1 单人模式：AI DM与NPC逻辑跑通方案**

在单人模式下，玩家担任侦探或某一位核心嫌疑人，其余所有角色及游戏主持人（DM）均由LLM扮演 44。要使单人模式顺畅运行，需解决多AI角色的记忆管理与交互协调问题。

首先，整个游戏循环（Game Loop）由LangGraph此类状态图框架进行编排 6。LangGraph负责维护当前的剧情节点（如：第一轮搜证阶段），记录玩家已经访问过的NPC，并防止重复的对话冗余 6。

其次，为了让NPC拥有深度的记忆且不超出LLM的上下文窗口限制，系统为每个NPC构建了独立的检索增强生成（RAG）记忆库 6。角色的数万字生平、复杂动机以及案发当天的详细行动轨迹被切块（Chunked）并向量化存储于数据库（如ChromaDB或FAISS）中。当玩家盘问NPC时（如：“你晚上九点在厨房干什么？”），系统仅检索与“九点”、“厨房”相关的向量片段，组合进提示词中供NPC进行回答，这不仅大幅降低了Token消耗，还保证了回答的精准与角色的一致性 6。

此外，在模拟多人圆桌讨论时，必须引入对话分析（Conversation Analysis）中的话步轮转（Turn-taking）系统 46。系统设置一个统筹代理，根据当前对话的语境，结合各NPC的内部状态，动态评估“下一个最应该发言的角色是谁”。这避免了所有NPC同时抢话或出现逻辑崩溃，使得单人玩家能够体验到极具策略性和自然感的沉浸式推理博弈 47。

### **4.2 多人模式：实时匹配与分布式认知配合**

在多人模式中，所有角色均由真实的真人玩家扮演，平台主要承担房间管理、状态同步与信息分发的职责 42。该模式对系统的低延迟并发处理能力提出了极高要求。

多人游戏的推进本质上是“分布式认知”（Distributed Cognition）的过程，即将碎片化的私密信息通过玩家的沟通转化为公共的全局情报 42。游戏状态被严格划分为“私密状态”（个人剧本、专属秘密线索）和“公共状态”（已公开的证据、投票进度）42。当玩家执行“公开线索”操作时，前端向后端发送变更请求，后端验证权限后，将该线索从私人JSON对象迁移至全局房间JSON对象中。

## **5\. 后端路由基建与实时网络架构**

为了支撑上述复杂的生成逻辑与高频的多人交互，后端的设施系统必须进行精细化的拆分与设计。

### **5.1 LLM网关与智能模型路由系统 (AI Gateway & Model Routing)**

根据需求，平台需要配置“每个功能使用的LLM模型”。这意味着系统不能将所有请求都发给单一的、昂贵的大模型，而必须在后端构建一个AI网关（AI Gateway），实施智能的模型路由（Model Routing）策略 12。

通过分析用户请求的任务类型、复杂度和模态，AI网关作为智能中介，动态地将请求分发给最合适的底层模型 12。

| 任务类型与复杂度 | 路由策略与模型选择 | 架构优势 |
| :---- | :---- | :---- |
| **全局剧本创作与复杂逻辑推演** | 路由至旗舰级推理模型（如 Gemini 2.5 Pro 或 GPT-4o），利用其超长上下文窗口处理庞大的数据关联 12。 | 确保剧本逻辑无懈可击，保障生成质量。 |
| **单人模式NPC日常对话与分类** | 路由至轻量级、低延迟模型（如 Gemini Flash, Llama 3 8B 或专属微调模型），处理基础的聊天和意图识别 12。 | 极大地降低Token成本，实现百毫秒级的快速响应，提升玩家体验 12。 |
| **文本向量化与RAG检索** | 路由至专门的嵌入模型（Embedding Models，如 text-embedding-3-small 或 Titan Embeddings）49。 | 高效处理记忆索引，节约计算资源。 |
| **多模态视觉生成与剧本图像** | 路由至独立的生图模型（如 GPT-image-2 接口或云端部署的 Stable Diffusion）1。 | 专职专办，结合前述的图像控制流产出高品质美术资产。 |

这种基于网关的多模型混合架构不仅实现了性能、延迟和成本的最佳平衡，还解耦了业务逻辑与特定的AI服务商，使得平台在未来可以随时无缝接入更新的LLM技术 49。

### **5.2 WebSocket与Redis构建的实时匹配网络**

在多人模式的对局匹配和房间管理方案上，系统采用 Node.js 结合 WebSockets 和 Redis 的经典高性能架构 7。

* **匹配队列机制：** 玩家发起寻找对局请求后，系统利用 Redis 的有序集合（Sorted Sets，如 ZADD 指令）将玩家加入对应剧本和模式（如6人局）的匹配队列中，按时间戳或隐藏分进行排序 7。  
* **原子化房间创建：** 为防止高并发下的数据竞态条件（例如两台服务器同时将同一个玩家拉入不同的房间），系统使用 Redis 的 WATCH 和 MULTI/EXEC 事务块。当队列达到满员条件时，原子性地弹出玩家数据，并生成一个包含TTL（生存时间）的房间ID，完成建房操作 7。  
* **实时状态同步：** 房间建立后，游戏状态通过 WebSockets 进行全双工通信 55。借助 Redis 的发布/订阅（Pub/Sub）机制，任何玩家的状态变更（如搜集线索、发起投票）都会被发布到特定的房间频道，所有订阅该频道的连接客户端将瞬间收到更新事件，从而实现无缝配合 54。

### **5.3 数据库模式选择：PostgreSQL vs MongoDB**

考虑到剧本杀数据结构复杂、属性层级多（如剧本包含多角色、多幕、随机生成的线索树），在持久化存储层面，使用 PostgreSQL 的 JSONB 字段类型相较于纯文档数据库 MongoDB 更具优势 57。

LLM生成的结构化剧本JSON可以直接以原貌存入 PostgreSQL 的 JSONB 列中，享受极高的数据写入和查询灵活性。同时，PostgreSQL 强大的事务（ACID）支持能够妥善处理平台上的核心业务数据（如用户的购买记录、创作者的版权收益分配等）。这种方案兼顾了AI生成内容的非结构化特性与商业平台的严谨性需求 57。

## **6\. UGC创作者生态与发布流转**

平台的生命力在于“用户和管理员都应该可以增加剧本”，即构建完善的 UGC（用户生成内容）生态体系 60。

系统提供一个可视化的“创作者面板”（Creator Studio），本质上是一个由LLM驱动的工作台 62。用户在此只需输入简单的故事构想和关键词，系统的代理工作流（Agent Workflow）便会自动接管后续繁重的工作。从初步大纲的搭建、角色秘密的编织，到线索的合理分配，再到调用视觉管道生成配套的封面和立绘，全程由AI作为“副驾驶”进行辅助 61。

在发布前，内置的质检智能体（QaAgent）会自动进行一轮模拟推演，检测是否缺乏关键性指向线索，或者是否存在无法闭环的逻辑死局，并向创作者提供修改建议 11。一旦定稿，系统生成完整的 JSON 数据包并存储。

借助前述的微前端架构和动态 UI 机制，新发布的剧本立刻作为一个独立的模块挂载到线上大厅的展示框中。其他玩家点击该剧本入口时，平台便根据 JSON 中的设计令牌自动渲染出匹配其题材的独立游戏界面，由此跑通了从“创意构思 \-\> 资产生成 \-\> 测试验证 \-\> 平台发布 \-\> 玩家游玩”的完整商业闭环 63。

## **结论**

综上所述，开发一款高度整合的LLM驱动线上剧本杀平台，需要跳出传统的Web开发思路，采用AI原生的系统架构设计。

通过部署多智能体协作框架，平台能够彻底解决大语言模型在长篇逻辑创作中的幻觉和不可控问题，自动化产出格式规范、逻辑自洽且充满悬疑博弈的优质剧本。在视觉呈现上，通过转译Agent生成精准提示词并结合IPAdapter与LoRA技术，系统攻克了AI生图的角色一致性难题，为海量剧本自动配备了专业的动态美术资产。

前端采用模块联邦的微前端架构结合生成式UI（GenUI）技术，使得每个剧本都能在单一的Web应用内呈现出完全独立的、美化的动态界面，实现了“千本千面”的极致用户体验。在后端，引入AI网关进行智能模型路由，合理分配Gemini、轻量级模型及图像大模型的调用，极大地提升了系统的响应速度并优化了运营成本。同时，依托于Node.js、Redis及WebSockets构建的实时通信与匹配基建，稳固支撑了从单人RAG沉浸式审问到多人分布式认知协作的复杂游戏状态流转。

这套全面覆盖内容生成、视觉渲染、逻辑状态管理与网络通信的全栈实现方案，将为平台构建一个生生不息、自我演进的智能UGC剧本杀生态打下最坚实的技术基石。

#### **引用的著作**

1. Collaborative Multi-Agent Scripts Generation for Enhancing Imperfect-Information Reasoning in Murder Mystery Games \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2604.11741v1](https://arxiv.org/html/2604.11741v1)  
2. \[2604.11741\] Collaborative Multi-Agent Scripts Generation for Enhancing Imperfect-Information Reasoning in Murder Mystery Games \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/abs/2604.11741](https://arxiv.org/abs/2604.11741)  
3. Deciphering Digital Detectives: Understanding LLM Behaviors and Capabilities in Multi-Agent Mystery Games \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2312.00746v2](https://arxiv.org/html/2312.00746v2)  
4. My Journey to Consistent AI Art: Taming DALL-E 3, Gemini & Flux Dev with Smart Prompting, 访问时间为 四月 24, 2026， [https://medium.com/@tharindusathsara/my-journey-to-consistent-ai-art-taming-dall-e-3-gemini-flux-dev-with-smart-prompting-b6bf947fd203](https://medium.com/@tharindusathsara/my-journey-to-consistent-ai-art-taming-dall-e-3-gemini-flux-dev-with-smart-prompting-b6bf947fd203)  
5. Create a Murder Mystery game powered by Gemini AI with SwiftUI \- Medium, 访问时间为 四月 24, 2026， [https://medium.com/google-cloud/create-a-murder-mystery-game-powered-by-gemini-ai-with-swiftui-6eee23742d53](https://medium.com/google-cloud/create-a-murder-mystery-game-powered-by-gemini-ai-with-swiftui-6eee23742d53)  
6. himajan766/mysteryagent: A murder mystery game generating agent \- GitHub, 访问时间为 四月 24, 2026， [https://github.com/himajan766/mysteryagent](https://github.com/himajan766/mysteryagent)  
7. Build matchmaking and game session state with Redis sorted sets, hashes, and TTLs, 访问时间为 四月 24, 2026， [https://redis.io/tutorials/matchmaking-and-game-session-state-with-redis/](https://redis.io/tutorials/matchmaking-and-game-session-state-with-redis/)  
8. Generative UI, 访问时间为 四月 24, 2026， [https://generativeui.github.io/](https://generativeui.github.io/)  
9. How to use ChatGPT to write a customised murder mystery game | Red Herring Games, 访问时间为 四月 24, 2026， [https://www.red-herring-games.com/how-to-use-chat-gpt-to-write-a-customised-murder-mystery-game/](https://www.red-herring-games.com/how-to-use-chat-gpt-to-write-a-customised-murder-mystery-game/)  
10. How AI Helped Me Write the Perfect Murder Mystery \- BUSN4400, 访问时间为 四月 24, 2026， [https://busn4400.wordpress.com/2025/03/19/how-ai-helped-me-write-the-perfect-murder-mystery/](https://busn4400.wordpress.com/2025/03/19/how-ai-helped-me-write-the-perfect-murder-mystery/)  
11. \[Literature Review\] Collaborative Multi-Agent Scripts Generation for Enhancing Imperfect-Information Reasoning in Murder Mystery Games, 访问时间为 四月 24, 2026， [https://www.themoonlight.io/review/collaborative-multi-agent-scripts-generation-for-enhancing-imperfect-information-reasoning-in-murder-mystery-games](https://www.themoonlight.io/review/collaborative-multi-agent-scripts-generation-for-enhancing-imperfect-information-reasoning-in-murder-mystery-games)  
12. Multi-Model Routing: Optimize AI Tasks Efficiently \- TrueFoundry, 访问时间为 四月 24, 2026， [https://www.truefoundry.com/blog/multi-model-routing](https://www.truefoundry.com/blog/multi-model-routing)  
13. The Dawn of Collaborative Intelligence: Multi-Agent AI Systems Powered by Large Language Models | by Frank Morales Aguilera | AI Simplified in Plain English | Medium, 访问时间为 四月 24, 2026， [https://medium.com/ai-simplified-in-plain-english/the-dawn-of-collaborative-intelligence-multi-agent-ai-systems-powered-by-large-language-models-dadfb725f0e3](https://medium.com/ai-simplified-in-plain-english/the-dawn-of-collaborative-intelligence-multi-agent-ai-systems-powered-by-large-language-models-dadfb725f0e3)  
14. \[論文評述\] Collaborative Multi-Agent Scripts Generation for Enhancing Imperfect-Information Reasoning in Murder Mystery Games, 访问时间为 四月 24, 2026， [https://www.themoonlight.io/tw/review/collaborative-multi-agent-scripts-generation-for-enhancing-imperfect-information-reasoning-in-murder-mystery-games](https://www.themoonlight.io/tw/review/collaborative-multi-agent-scripts-generation-for-enhancing-imperfect-information-reasoning-in-murder-mystery-games)  
15. Murder Mystery Game \- Ken's Developer Portfolio, 访问时间为 四月 24, 2026， [https://kenneth-ljs.com/article/murder-mystery-game/](https://kenneth-ljs.com/article/murder-mystery-game/)  
16. eliotjlee/holmes: Holmes is an interactive, text-based crime investigation game powered by a large language model (LLM). With each replay, the game offers a fresh narrative, ensuring a unique experience for players every time. \- GitHub, 访问时间为 四月 24, 2026， [https://github.com/eliotjlee/holmes](https://github.com/eliotjlee/holmes)  
17. \[2508.19288\] Tricking LLM-Based NPCs into Spilling Secrets \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/abs/2508.19288](https://arxiv.org/abs/2508.19288)  
18. Deception, Persuasion, and Trust: Evaluating Large Language Models in a Complex Hidden Role Game \- GippLab, 访问时间为 四月 24, 2026， [https://gipplab.uni-goettingen.de/wp-content/papercite-data/pdf/bauer2025.pdf](https://gipplab.uni-goettingen.de/wp-content/papercite-data/pdf/bauer2025.pdf)  
19. How To Create Consistent Characters With AI | Leonardo.Ai, 访问时间为 四月 24, 2026， [https://leonardo.ai/news/character-consistency-with-leonardo-character-reference-6-examples/](https://leonardo.ai/news/character-consistency-with-leonardo-character-reference-6-examples/)  
20. GitHub \- DigitalBoopLtd/murder-mystery: A voice-first murder mystery game powered by Model Context Protocol (MCP). Investigate crimes, interrogate AI suspects, and solve procedurally generated mysteries in a 90s point-and-click adventure style., 访问时间为 四月 24, 2026， [https://github.com/DigitalBoopLtd/murder-mystery](https://github.com/DigitalBoopLtd/murder-mystery)  
21. How to Create Consistent Characters ComfyUI: The 2025 Step‑by‑Step Workflow (IPAdapter \+ ControlNet) | by Pradeep Alexander Danielraj, 访问时间为 四月 24, 2026， [https://tgecrypto365.medium.com/how-to-create-consistent-characters-comfyui-the-2025-step-by-step-workflow-ipadapter-76edbfca0baf](https://tgecrypto365.medium.com/how-to-create-consistent-characters-comfyui-the-2025-step-by-step-workflow-ipadapter-76edbfca0baf)  
22. How are people making AI videos with such consistent characters and style?, 访问时间为 四月 24, 2026， [https://www.reddit.com/r/generativeAI/comments/1rxgqrx/how\_are\_people\_making\_ai\_videos\_with\_such/](https://www.reddit.com/r/generativeAI/comments/1rxgqrx/how_are_people_making_ai_videos_with_such/)  
23. Build Consistent AI Characters Without Spending a Dime\! \#ConsistentCharacterAI, 访问时间为 四月 24, 2026， [https://www.youtube.com/watch?v=-oeqbke0wMU](https://www.youtube.com/watch?v=-oeqbke0wMU)  
24. Best Open-Source Model for Character Consistency with Reference Image?, 访问时间为 四月 24, 2026， [https://www.reddit.com/r/comfyui/comments/1rv4fmh/best\_opensource\_model\_for\_character\_consistency/](https://www.reddit.com/r/comfyui/comments/1rv4fmh/best_opensource_model_for_character_consistency/)  
25. Best Open-Source Approaches for Consistent Character Creation with LoRA Training : r/comfyui \- Reddit, 访问时间为 四月 24, 2026， [https://www.reddit.com/r/comfyui/comments/1q766mj/best\_opensource\_approaches\_for\_consistent/](https://www.reddit.com/r/comfyui/comments/1q766mj/best_opensource_approaches_for_consistent/)  
26. Micro Frontends: Comparing Leading Frameworks | by Oleksandr Ovcharov | Outreach Prague | Medium, 访问时间为 四月 24, 2026， [https://medium.com/outreach-prague/micro-frontends-comparing-leading-frameworks-cb54cd9f7a03](https://medium.com/outreach-prague/micro-frontends-comparing-leading-frameworks-cb54cd9f7a03)  
27. Micro Frontends: When They Make Sense and When They Don't \- Lukas Niessen, 访问时间为 四月 24, 2026， [https://lukasniessen.medium.com/micro-frontends-when-they-make-sense-and-when-they-dont-a1a06b726065](https://lukasniessen.medium.com/micro-frontends-when-they-make-sense-and-when-they-dont-a1a06b726065)  
28. Building True Micro-Frontends: Beyond iFrames with Module Federation \- DEV Community, 访问时间为 四月 24, 2026， [https://dev.to/abdecoder/building-true-micro-frontends-beyond-iframes-with-module-federation-3jen](https://dev.to/abdecoder/building-true-micro-frontends-beyond-iframes-with-module-federation-3jen)  
29. Micro Frontend Architecture: A Complete Guide to Modern Frontend Development \- Treinetic, 访问时间为 四月 24, 2026， [https://treinetic.com/micro-frontend-architecture-a-complete-guide-to-modern-frontend-development/](https://treinetic.com/micro-frontend-architecture-a-complete-guide-to-modern-frontend-development/)  
30. Micro Frontends \- Martin Fowler, 访问时间为 四月 24, 2026， [https://martinfowler.com/articles/micro-frontends.html](https://martinfowler.com/articles/micro-frontends.html)  
31. Boundaries as Architecture: How Isolation Protects Modular Frontends | by Enrico Piovesan | Rethinking the Client | Medium, 访问时间为 四月 24, 2026， [https://medium.com/rethinking-the-client-a-new-era-of-modular/boundaries-as-architecture-how-isolation-protects-modular-frontends-bb52fe7a02bc](https://medium.com/rethinking-the-client-a-new-era-of-modular/boundaries-as-architecture-how-isolation-protects-modular-frontends-bb52fe7a02bc)  
32. Theme variables \- Core concepts \- Tailwind CSS, 访问时间为 四月 24, 2026， [https://tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)  
33. Dynamic Theming with Next.js, Tailwind & CMS for Real-Time UI Updates | Konabos, 访问时间为 四月 24, 2026， [https://konabos.com/blog/dynamic-theming-with-next-js-tailwind-cms-for-real-time-ui-updates](https://konabos.com/blog/dynamic-theming-with-next-js-tailwind-cms-for-real-time-ui-updates)  
34. Dynamic Theme Switching with CSS Variables and Tailwind \- YouTube, 访问时间为 四月 24, 2026， [https://www.youtube.com/watch?v=TFfWsOa5GfE](https://www.youtube.com/watch?v=TFfWsOa5GfE)  
35. How to do dynamic themes using CSS variables and Tailwind in Next.js app? \- Reddit, 访问时间为 四月 24, 2026， [https://www.reddit.com/r/webdev/comments/13uz9w5/how\_to\_do\_dynamic\_themes\_using\_css\_variables\_and/](https://www.reddit.com/r/webdev/comments/13uz9w5/how_to_do_dynamic_themes_using_css_variables_and/)  
36. Generative UI: A rich, custom, visual interactive user experience for any prompt, 访问时间为 四月 24, 2026， [https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/](https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/)  
37. AI is the new UI: Generative UI with FastHTML | by Pol Alvarez Vecino \- Medium, 访问时间为 四月 24, 2026， [https://medium.com/@pol.avec/ai-is-the-new-ui-generative-ui-with-fasthtml-e8cfcc98e5b5](https://medium.com/@pol.avec/ai-is-the-new-ui-generative-ui-with-fasthtml-e8cfcc98e5b5)  
38. Generative UI: LLMs are Effective UI Generators \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2604.09577v1](https://arxiv.org/html/2604.09577v1)  
39. Building the First Generative UI API: Technical Architecture and Design Decisions Behind C1 \- Thesys, 访问时间为 四月 24, 2026， [https://www.thesys.dev/blogs/generative-ui-architecture](https://www.thesys.dev/blogs/generative-ui-architecture)  
40. AI Agent for UI Design: Safe UI Generation with A2UI \- Grid Dynamics, 访问时间为 四月 24, 2026， [https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui)  
41. Generative UI Workshop: Creating Dynamic Web Experiences with LLMs, 访问时间为 四月 24, 2026， [https://javascript-conference.com/generativeai/generative-ui-dynamic-web-llms-workshop/](https://javascript-conference.com/generativeai/generative-ui-dynamic-web-llms-workshop/)  
42. Here's What Makes Jubensha Different \- mssv, 访问时间为 四月 24, 2026， [https://mssv.net/2025/03/26/heres-what-makes-jubensha-different/](https://mssv.net/2025/03/26/heres-what-makes-jubensha-different/)  
43. PLAYER\*: Enhancing LLM-based Multi-Agent Communication and Interaction in Murder Mystery Games \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2404.17662v1](https://arxiv.org/html/2404.17662v1)  
44. GenAI\_Agents/all\_agents\_tutorials/murder\_mystery\_agent\_langgraph.ipynb at main \- GitHub, 访问时间为 四月 24, 2026， [https://github.com/NirDiamant/GenAI\_Agents/blob/main/all\_agents\_tutorials/murder\_mystery\_agent\_langgraph.ipynb](https://github.com/NirDiamant/GenAI_Agents/blob/main/all_agents_tutorials/murder_mystery_agent_langgraph.ipynb)  
45. PLAYER\*: Enhancing LLM-based Multi-Agent Communication and Interaction in Murder Mystery Games \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2404.17662v2](https://arxiv.org/html/2404.17662v2)  
46. Who speaks next? Multi-party AI discussion leveraging the systematics of turn-taking in Murder Mystery games \- Frontiers, 访问时间为 四月 24, 2026， [https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582287/full](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582287/full)  
47. Who Speaks Next? Multi-party AI Discussion Leveraging the Systematics of Turn-taking in Murder Mystery Games \- ResearchGate, 访问时间为 四月 24, 2026， [https://www.researchgate.net/publication/386555057\_Who\_Speaks\_Next\_Multi-party\_AI\_Discussion\_Leveraging\_the\_Systematics\_of\_Turn-taking\_in\_Murder\_Mystery\_Games](https://www.researchgate.net/publication/386555057_Who_Speaks_Next_Multi-party_AI_Discussion_Leveraging_the_Systematics_of_Turn-taking_in_Murder_Mystery_Games)  
48. Who speaks next? Multi-party AI discussion leveraging the systematics of turn-taking in Murder Mystery games \- PMC, 访问时间为 四月 24, 2026， [https://pmc.ncbi.nlm.nih.gov/articles/PMC12209177/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12209177/)  
49. Multi-LLM routing strategies for generative AI applications on AWS | Artificial Intelligence, 访问时间为 四月 24, 2026， [https://aws.amazon.com/blogs/machine-learning/multi-llm-routing-strategies-for-generative-ai-applications-on-aws/](https://aws.amazon.com/blogs/machine-learning/multi-llm-routing-strategies-for-generative-ai-applications-on-aws/)  
50. AI Gateway Pattern: Centralized Model Access Layer \- Medium, 访问时间为 四月 24, 2026， [https://medium.com/@vasanthancomrads/ai-gateway-pattern-centralized-model-access-layer-c5049e4f151f](https://medium.com/@vasanthancomrads/ai-gateway-pattern-centralized-model-access-layer-c5049e4f151f)  
51. LLM Router Blueprint by NVIDIA, 访问时间为 四月 24, 2026， [https://build.nvidia.com/nvidia/llm-router](https://build.nvidia.com/nvidia/llm-router)  
52. A Developer's Guide to Model Routing | by Karl Weinmeister | Google Cloud \- Medium, 访问时间为 四月 24, 2026， [https://medium.com/google-cloud/a-developers-guide-to-model-routing-1f21ecc34d60](https://medium.com/google-cloud/a-developers-guide-to-model-routing-1f21ecc34d60)  
53. Colyseus \- Real-Time Multiplayer Framework for Node.js, 访问时间为 四月 24, 2026， [https://colyseus.io/](https://colyseus.io/)  
54. How to Build Matchmaking Systems with Redis \- OneUptime, 访问时间为 四月 24, 2026， [https://oneuptime.com/blog/post/2026-01-21-redis-matchmaking-systems/view](https://oneuptime.com/blog/post/2026-01-21-redis-matchmaking-systems/view)  
55. Building real-time applications with WebSockets \- Render, 访问时间为 四月 24, 2026， [https://render.com/articles/building-real-time-applications-with-websockets](https://render.com/articles/building-real-time-applications-with-websockets)  
56. Design a Simple Real-Time Matchmaking Service: Architecture & Implementation | by Yash, 访问时间为 四月 24, 2026， [https://yashh21.medium.com/designing-a-simple-real-time-matchmaking-service-architecture-implementation-96e10f095ce1](https://yashh21.medium.com/designing-a-simple-real-time-matchmaking-service-architecture-implementation-96e10f095ce1)  
57. PostgreSQL Murdered MongoDB and Nobody Noticed | by Engineering Unfiltered | Let's Code Future | Medium, 访问时间为 四月 24, 2026， [https://medium.com/lets-code-future/postgresql-murdered-mongodb-and-nobody-noticed-d3a2b34592f3](https://medium.com/lets-code-future/postgresql-murdered-mongodb-and-nobody-noticed-d3a2b34592f3)  
58. Ask HN: Have you ever chosen Postgres over Mongo and regretted it? \- Hacker News, 访问时间为 四月 24, 2026， [https://news.ycombinator.com/item?id=17497164](https://news.ycombinator.com/item?id=17497164)  
59. JSONB in Postgres and Mongo DB use cases : r/ExperiencedDevs \- Reddit, 访问时间为 四月 24, 2026， [https://www.reddit.com/r/ExperiencedDevs/comments/1q09l60/jsonb\_in\_postgres\_and\_mongo\_db\_use\_cases/](https://www.reddit.com/r/ExperiencedDevs/comments/1q09l60/jsonb_in_postgres_and_mongo_db_use_cases/)  
60. The Generative AI Revolution will Enable Anyone to Create Games | Andreessen Horowitz, 访问时间为 四月 24, 2026， [https://a16z.com/the-generative-ai-revolution/](https://a16z.com/the-generative-ai-revolution/)  
61. User-Generated Content and Editors in Games: A Comprehensive Survey \- arXiv, 访问时间为 四月 24, 2026， [https://arxiv.org/html/2412.13743v1](https://arxiv.org/html/2412.13743v1)  
62. AI-assisted game production: From static concept to interactive prototype \- AWS, 访问时间为 四月 24, 2026， [https://aws.amazon.com/blogs/gametech/ai-assisted-game-production-from-static-concept-to-interactive-prototype/](https://aws.amazon.com/blogs/gametech/ai-assisted-game-production-from-static-concept-to-interactive-prototype/)  
63. User-Generated Content Platforms: Managing the Relationship Triangle \- ResearchGate, 访问时间为 四月 24, 2026， [https://www.researchgate.net/publication/392115040\_User-Generated\_Content\_Platforms\_Managing\_the\_Relationship\_Triangle](https://www.researchgate.net/publication/392115040_User-Generated_Content_Platforms_Managing_the_Relationship_Triangle)  
64. AI UGC: What It Is \+ 15 Tools to Use in 2026 \- Showcase, 访问时间为 四月 24, 2026， [https://www.showca.se/post/top-ai-ugc-tools](https://www.showca.se/post/top-ai-ugc-tools)