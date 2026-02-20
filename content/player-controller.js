// PlayerController – abstracts YouTube video player controls.
// Prefers native #movie_player API; falls back to <video> element.
// Exposed as window.ShadowInput.PlayerController

var ShadowInput = ShadowInput || {};

ShadowInput.PlayerController = (() => {
  function getPlayer() {
    return document.querySelector('#movie_player');
  }

  function getVideo() {
    return document.querySelector('video');
  }

  function pause() {
    const player = getPlayer();
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    } else {
      const v = getVideo();
      if (v) v.pause();
    }
  }

  function play() {
    const player = getPlayer();
    if (player && typeof player.playVideo === 'function') {
      player.playVideo();
    } else {
      const v = getVideo();
      if (v) v.play();
    }
  }

  function seekTo(seconds) {
    const player = getPlayer();
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(seconds, true);
    } else {
      const v = getVideo();
      if (v) v.currentTime = seconds;
    }
  }

  function seekToMs(ms) {
    seekTo(ms / 1000);
  }

  function getPlaybackRate() {
    const player = getPlayer();
    if (player && typeof player.getPlaybackRate === 'function') {
      const rate = Number(player.getPlaybackRate());
      if (Number.isFinite(rate) && rate > 0) return rate;
    }
    const v = getVideo();
    if (v && Number.isFinite(v.playbackRate) && v.playbackRate > 0) return v.playbackRate;
    return 1;
  }

  function setPlaybackRate(rawRate) {
    const rate = Math.max(0.25, Math.min(4, Number(rawRate) || 1));
    const player = getPlayer();
    if (player && typeof player.setPlaybackRate === 'function') {
      try {
        player.setPlaybackRate(rate);
      } catch (_) {}
    }
    const v = getVideo();
    if (v) {
      try {
        v.playbackRate = rate;
      } catch (_) {}
    }
  }

  function getCurrentTime() {
    const player = getPlayer();
    if (player && typeof player.getCurrentTime === 'function') {
      return player.getCurrentTime();
    }
    const v = getVideo();
    return v ? v.currentTime : 0;
  }

  function getCurrentTimeMs() {
    return Math.round(getCurrentTime() * 1000);
  }

  /**
   * Returns the current player state.
   * -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
   */
  function getState() {
    const player = getPlayer();
    if (player && typeof player.getPlayerState === 'function') {
      return player.getPlayerState();
    }
    const v = getVideo();
    if (!v) return -1;
    if (v.paused) return 2;
    if (v.ended) return 0;
    return 1;
  }

  function isPaused() {
    return getState() === 2;
  }

  function isPlaying() {
    return getState() === 1;
  }

  /**
   * Returns the video ID from the current URL.
   */
  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v') || '';
  }

  /**
   * Listen to video events (play, pause, timeupdate, etc.)
   * Returns an unsubscribe function.
   */
  function onVideoEvent(eventName, fn) {
    const v = getVideo();
    if (!v) return () => {};
    v.addEventListener(eventName, fn);
    return () => v.removeEventListener(eventName, fn);
  }

  return {
    pause,
    play,
    seekTo,
    seekToMs,
    getPlaybackRate,
    setPlaybackRate,
    getCurrentTime,
    getCurrentTimeMs,
    getState,
    isPaused,
    isPlaying,
    getVideoId,
    onVideoEvent,
  };
})();
