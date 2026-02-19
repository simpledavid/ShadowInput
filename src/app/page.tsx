const LANDING_CSS = `
  .landing {
    min-height: 100vh;
    color: #f4f7ff;
    background: #050a16;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    position: relative;
    overflow: hidden;
  }
  .bg-glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 14% 0%, rgba(76, 130, 255, 0.22), transparent 42%),
      radial-gradient(circle at 82% 18%, rgba(0, 229, 255, 0.14), transparent 40%),
      radial-gradient(circle at 74% 84%, rgba(255, 75, 220, 0.12), transparent 38%);
  }
  .wrap {
    position: relative;
    width: min(1120px, 92vw);
    margin: 0 auto;
    padding: 24px 0 36px;
  }
  .topbar,
  .hero,
  .card,
  .install {
    border: 1px solid rgba(162, 244, 253, 0.2);
    background: rgba(13, 20, 41, 0.84);
    border-radius: 16px;
    backdrop-filter: blur(8px);
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    font-size: 22px;
    font-weight: 900;
    color: #d7fbff;
    border: 1px solid rgba(162, 244, 253, 0.6);
    background: linear-gradient(135deg, rgba(83, 234, 253, 0.35), rgba(48, 128, 255, 0.35), rgba(236, 108, 255, 0.35));
  }
  .brand-name {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #f4f7ff;
  }
  .brand-sub {
    margin: 0;
    font-size: 12px;
    color: rgba(206, 250, 254, 0.78);
  }
  .hero {
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1.25fr 1fr;
    gap: 18px;
    padding: 24px;
  }
  .badge {
    display: inline-block;
    margin: 0;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(242, 169, 255, 0.45);
    background: rgba(236, 108, 255, 0.1);
    color: rgba(250, 232, 255, 0.95);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  h1 {
    margin: 14px 0 0;
    font-size: clamp(30px, 5vw, 54px);
    line-height: 1.15;
  }
  .desc {
    margin-top: 14px;
    max-width: 720px;
    color: rgba(228, 228, 231, 0.9);
    line-height: 1.9;
    font-size: 15px;
  }
  .actions {
    margin-top: 20px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    padding: 0 18px;
    border-radius: 10px;
    border: 1px solid rgba(162, 244, 253, 0.4);
    color: #071024;
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    background: linear-gradient(90deg, #00d2ef, #3080ff);
  }
  .btn-ghost {
    color: #cefafe;
    background: rgba(83, 234, 253, 0.14);
  }
  .btn-small {
    height: 36px;
    font-size: 13px;
    padding: 0 14px;
  }
  .hero-side {
    border: 1px solid rgba(83, 234, 253, 0.24);
    border-radius: 12px;
    background: #0a1022;
    padding: 16px;
  }
  .kicker {
    margin: 0;
    color: rgba(206, 250, 254, 0.78);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .line {
    margin: 12px 0 0;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 15px;
    line-height: 1.55;
  }
  .line-en {
    border: 1px solid rgba(63, 63, 70, 0.9);
    background: rgba(24, 24, 27, 0.74);
    color: rgba(228, 228, 231, 0.95);
  }
  .line-zh {
    border: 1px solid rgba(83, 234, 253, 0.33);
    background: rgba(0, 210, 239, 0.12);
    color: #cefafe;
  }
  .grid {
    margin-top: 20px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }
  .card {
    padding: 18px;
  }
  .tag {
    margin: 0;
    color: rgba(206, 250, 254, 0.78);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  h2 {
    margin: 8px 0 0;
    font-size: 22px;
  }
  .card p {
    margin: 10px 0 0;
    color: rgba(212, 212, 216, 0.9);
    line-height: 1.8;
    font-size: 14px;
  }
  .install {
    margin-top: 20px;
    padding: 20px;
  }
  .install ol {
    margin: 14px 0 0;
    padding-left: 20px;
  }
  .install li {
    margin: 10px 0;
    color: rgba(228, 228, 231, 0.92);
    line-height: 1.8;
  }
  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
    }
    .grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default function Home() {
  return (
    <>
      <main className="landing">
        <div className="bg-glow" />
        <div className="wrap">
          <header className="topbar">
            <div className="brand">
              <div className="logo">S</div>
              <div>
                <p className="brand-name">ShadowInput</p>
                <p className="brand-sub">YouTube 字幕学习插件</p>
              </div>
            </div>
            <a className="btn btn-small" href="/downloads/shadowinput-extension.zip" download>
              下载插件
            </a>
          </header>

          <section className="hero">
            <div className="hero-main">
              <p className="badge">Cyber Learning Mode</p>
              <h1>
                看 YouTube 的同时
                <br />
                更快学会英语字幕
              </h1>
              <p className="desc">看到不会的词直接停住查，字幕双语对照，生词即时收藏，不打断观看节奏。</p>
              <div className="actions">
                <a className="btn" href="/downloads/shadowinput-extension.zip" download>
                  立即下载 ZIP
                </a>
                <a className="btn btn-ghost" href="#install">
                  查看安装步骤
                </a>
              </div>
            </div>

            <div className="hero-side">
              <p className="kicker">实时体验</p>
              <p className="line line-en">even the UK wasn't this cold.</p>
              <p className="line line-zh">即使在英国，也没这么冷。</p>
            </div>
          </section>

          <section className="grid">
            <article className="card">
              <p className="tag">Hover to pause</p>
              <h2>悬停即查询</h2>
              <p>鼠标停在单词上，视频自动暂停并弹出释义，移开自动继续播放。</p>
            </article>
            <article className="card">
              <p className="tag">EN + 中文</p>
              <h2>双语字幕对照</h2>
              <p>英文字幕下方直接显示中文字幕，跟读、理解和记忆更连贯。</p>
            </article>
            <article className="card">
              <p className="tag">Flashcards</p>
              <h2>生词收藏导出</h2>
              <p>一键收藏生词，后续可在扩展里统一复习并导出。</p>
            </article>
          </section>

          <section id="install" className="install">
            <h2>安装只要 3 步</h2>
            <ol>
              <li>下载插件 ZIP 并解压到本地目录。</li>
              <li>打开 chrome://extensions 或 edge://extensions。</li>
              <li>开启开发者模式，点击“加载已解压的扩展程序”，选择目录即可。</li>
            </ol>
          </section>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
    </>
  );
}