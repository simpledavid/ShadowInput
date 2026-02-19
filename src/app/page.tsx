const LANDING_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=IBM+Plex+Sans+SC:wght@400;500;700&display=swap");

:root {
  --bg: #060b16;
  --surface: rgba(14, 22, 43, 0.8);
  --surface-strong: rgba(12, 18, 35, 0.92);
  --line: rgba(152, 217, 255, 0.22);
  --text: #f4f8ff;
  --muted: rgba(212, 224, 246, 0.76);
  --cyan: #76ecff;
  --blue: #4e7dff;
  --magenta: #ff72df;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
}

.landing {
  min-height: 100vh;
  color: var(--text);
  font-family: "Sora", "IBM Plex Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  position: relative;
  overflow-x: hidden;
}

.bg-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 12% -6%, rgba(75, 131, 255, 0.32), transparent 38%),
    radial-gradient(circle at 86% 12%, rgba(0, 223, 255, 0.22), transparent 36%),
    radial-gradient(circle at 70% 82%, rgba(255, 103, 231, 0.18), transparent 34%);
}

.bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(137, 203, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(137, 203, 255, 0.08) 1px, transparent 1px);
  background-size: 26px 26px;
  mask-image: radial-gradient(circle at 50% 30%, black, transparent 75%);
}

.wrap {
  position: relative;
  z-index: 1;
  width: min(1180px, 92vw);
  margin: 0 auto;
  padding: 28px 0 52px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 12px 16px;
  background: rgba(11, 18, 36, 0.72);
  backdrop-filter: blur(10px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 20px;
  color: #e9fdff;
  border: 1px solid rgba(154, 231, 255, 0.62);
  background: linear-gradient(145deg, rgba(69, 120, 255, 0.55), rgba(29, 48, 95, 0.78), rgba(253, 115, 231, 0.45));
  box-shadow: 0 10px 28px rgba(20, 31, 64, 0.55);
}

.brand-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.brand-sub {
  margin: 1px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill {
  border: 1px solid rgba(156, 208, 255, 0.38);
  border-radius: 999px;
  color: #d5e8ff;
  background: rgba(90, 125, 214, 0.16);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 11px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid transparent;
  transition: transform 0.16s ease, filter 0.16s ease;
}

.btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.btn-primary {
  color: #051122;
  background: linear-gradient(90deg, var(--cyan), #6ca7ff);
  border-color: rgba(153, 231, 255, 0.42);
  padding: 0 16px;
}

.hero {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
}

.panel {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  backdrop-filter: blur(10px);
}

.hero-main {
  padding: 28px;
}

.badge {
  display: inline-block;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 146, 239, 0.5);
  background: rgba(255, 110, 227, 0.12);
  color: #ffd8f8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 5px 12px;
}

.hero h1 {
  margin: 14px 0 0;
  font-size: clamp(34px, 5vw, 62px);
  line-height: 1.08;
  letter-spacing: -0.02em;
}

.hero-desc {
  margin: 14px 0 0;
  max-width: 760px;
  color: var(--muted);
  line-height: 1.9;
  font-size: 15px;
}

.hero-actions {
  margin-top: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.btn-secondary {
  color: #d2f8ff;
  border-color: rgba(129, 230, 255, 0.34);
  background: rgba(66, 194, 255, 0.12);
  padding: 0 16px;
}

.chips {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #d6e7ff;
  border: 1px solid rgba(157, 186, 255, 0.28);
  background: rgba(89, 111, 176, 0.15);
}

.hero-side {
  padding: 18px;
  background: linear-gradient(170deg, rgba(13, 22, 43, 0.94), rgba(8, 14, 29, 0.95));
}

.preview-title {
  margin: 0;
  font-size: 13px;
  color: #bcefff;
  letter-spacing: 0.03em;
  font-weight: 700;
}

.subtitle-box {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(145, 190, 255, 0.28);
  background: rgba(8, 13, 26, 0.74);
}

.en-line {
  margin: 0;
  font-size: 18px;
  line-height: 1.55;
}

.zh-line {
  margin: 8px 0 0;
  font-size: 15px;
  line-height: 1.55;
  color: #b9f6ff;
}

.ai-soon {
  margin-top: 14px;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 128, 235, 0.32);
  background: rgba(255, 91, 224, 0.08);
}

.ai-soon p {
  margin: 0;
}

.ai-soon .t1 {
  font-size: 12px;
  font-weight: 700;
  color: #ffc8f5;
}

.ai-soon .t2 {
  margin-top: 6px;
  font-size: 13px;
  color: #f8def8;
  line-height: 1.7;
}

.section {
  margin-top: 16px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 22px;
  letter-spacing: -0.01em;
}

.features {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.feature-card {
  border: 1px solid rgba(151, 214, 255, 0.2);
  border-radius: 14px;
  padding: 15px;
  background: var(--surface-strong);
}

.feature-no {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #8eeeff;
  font-weight: 700;
}

.feature-title {
  margin: 6px 0 0;
  font-size: 19px;
}

.feature-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--muted);
}

.feature-status {
  margin-top: 10px;
  display: inline-block;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border: 1px solid rgba(255, 157, 239, 0.4);
  color: #ffd5f7;
  background: rgba(255, 103, 229, 0.12);
}

.roadmap {
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  padding: 16px;
}

.road-list {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.road-item {
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(154, 208, 255, 0.23);
  background: rgba(10, 16, 30, 0.72);
}

.road-item .phase {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #97ecff;
}

.road-item .name {
  margin: 6px 0 0;
  font-size: 16px;
  font-weight: 700;
}

.road-item .desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.72;
  color: var(--muted);
}

.install {
  margin-top: 16px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface);
  padding: 18px;
}

.install-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.install-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(132, 182, 255, 0.24);
  background: rgba(9, 15, 28, 0.7);
}

.step-no {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  color: #041322;
  background: linear-gradient(140deg, #8af1ff, #70a4ff);
}

.step-text {
  font-size: 14px;
  line-height: 1.75;
  color: #e6efff;
}

.footer {
  margin-top: 18px;
  text-align: center;
  color: rgba(174, 197, 235, 0.74);
  font-size: 12px;
}

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .features {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .road-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .wrap {
    padding-top: 16px;
  }
  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .top-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .hero-main,
  .hero-side,
  .install,
  .roadmap {
    padding: 14px;
  }
  .hero h1 {
    font-size: 34px;
  }
  .features {
    grid-template-columns: 1fr;
  }
}
`;

const FEATURES = [
  {
    no: "01",
    title: "悬停即查词",
    desc: "鼠标停在单词上，视频自动暂停并展示释义，移开自动继续播放。",
  },
  {
    no: "02",
    title: "双语字幕对照",
    desc: "英文字幕下方实时显示中文，边看边懂，跟读与理解更顺滑。",
  },
  {
    no: "03",
    title: "生词收藏导出",
    desc: "遇到重点词一键加入生词本，后续在扩展里统一复习并导出。",
  },
  {
    no: "04",
    title: "AI 字幕（即将上线）",
    desc: "无字幕视频也能自动生成时间轴 + 双语字幕，优先保证同步与可读性。",
    status: "Coming Soon",
  },
];

const ROADMAP = [
  {
    phase: "NOW",
    name: "v0.1 稳定学习流",
    desc: "悬停暂停查词、双语字幕、生词收藏导出，形成完整学习闭环。",
  },
  {
    phase: "NEXT",
    name: "AI 字幕 Beta",
    desc: "支持无字幕视频自动转写与翻译，支持词级时间点与术语优化。",
  },
  {
    phase: "LATER",
    name: "更强学习模式",
    desc: "加入精听跟读、难词回放、个性化复习建议，强化长期记忆效率。",
  },
];

const STEPS = [
  "下载插件 ZIP 并解压到本地目录。",
  "打开 chrome://extensions 或 edge://extensions。",
  "开启开发者模式，点击“加载已解压的扩展程序”，选择目录即可。",
];

export default function Home() {
  return (
    <>
      <main className="landing">
        <div className="bg-orbs" />
        <div className="bg-grid" />

        <div className="wrap">
          <header className="topbar">
            <div className="brand">
              <div className="logo">S</div>
              <div>
                <p className="brand-name">ShadowInput</p>
                <p className="brand-sub">YouTube 字幕学习插件</p>
              </div>
            </div>

            <div className="top-actions">
              <span className="pill">Manifest V3</span>
              <span className="pill">Chrome / Edge</span>
              <a className="btn btn-primary" href="/downloads/shadowinput-extension.zip" download>
                下载插件
              </a>
            </div>
          </header>

          <section className="hero">
            <article className="panel hero-main">
              <p className="badge">Cyber Learning Mode</p>
              <h1>
                让 YouTube
                <br />
                变成你的沉浸式英语教室
              </h1>
              <p className="hero-desc">
                ShadowInput 把“看视频 + 学语言”做成一个连续体验：看到不会的词直接停住查，字幕双语对照，生词即时收藏。
                后续将加入 AI 字幕，让无字幕视频也能进入学习模式。
              </p>

              <div className="hero-actions">
                <a className="btn btn-primary" href="/downloads/shadowinput-extension.zip" download>
                  立即下载 ZIP
                </a>
                <a className="btn btn-secondary" href="#install">
                  查看安装步骤
                </a>
              </div>

              <div className="chips">
                <span className="chip">双语字幕</span>
                <span className="chip">悬停查词</span>
                <span className="chip">生词本导出</span>
                <span className="chip">AI 字幕 Soon</span>
              </div>
            </article>

            <aside className="panel hero-side">
              <p className="preview-title">实时体验</p>
              <div className="subtitle-box">
                <p className="en-line">even the UK wasn't this cold.</p>
                <p className="zh-line">即使在英国，也没这么冷。</p>
              </div>

              <div className="ai-soon">
                <p className="t1">AI 字幕计划</p>
                <p className="t2">后续支持自动转写 + 翻译 + 对齐时间轴，解决“视频没字幕无法学”的问题。</p>
              </div>
            </aside>
          </section>

          <section className="section">
            <h2 className="section-title">核心能力</h2>
            <div className="features">
              {FEATURES.map((feature) => (
                <article key={feature.no} className="feature-card">
                  <p className="feature-no">FEATURE {feature.no}</p>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.desc}</p>
                  {feature.status ? <span className="feature-status">{feature.status}</span> : null}
                </article>
              ))}
            </div>
          </section>

          <section className="roadmap">
            <h2 className="section-title">产品路线图</h2>
            <div className="road-list">
              {ROADMAP.map((item) => (
                <article key={item.phase} className="road-item">
                  <p className="phase">{item.phase}</p>
                  <p className="name">{item.name}</p>
                  <p className="desc">{item.desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="install" className="install">
            <h2 className="section-title">安装只要 3 步</h2>
            <ol className="install-list">
              {STEPS.map((step, idx) => (
                <li key={step} className="install-item">
                  <span className="step-no">{idx + 1}</span>
                  <span className="step-text">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <footer className="footer">ShadowInput · YouTube Learning Mode</footer>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
    </>
  );
}