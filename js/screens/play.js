import { me } from '../melon.js';
import { game } from '../game.js';

game.PlayScreen = class PlayScreen extends me.Stage {
  constructor() {
    super();
    // lower audio volume on firefox browser (v19: ua moved to device.platform)
    const vol = me.device.platform.ua.indexOf('Firefox') !== -1 ? 0.3 : 0.5;
    me.audio.setVolume(vol);
  }

  onResetEvent() {
    me.game.reset();
    me.audio.stop('theme');
    if (!game.data.muted) {
      me.audio.play('theme', true);
    }

    me.input.bindKey(me.input.KEY.SPACE, 'fly', true);
    game.data.score = 0;
    game.data.steps = 0;
    game.data.start = false;
    game.data.newHiScore = false;

    me.game.world.addChild(new game.BackgroundLayer('bg', 1));

    this.ground1 = me.pool.pull('ground', 0, me.game.viewport.height - 96);
    this.ground2 = me.pool.pull('ground', me.game.viewport.width, me.game.viewport.height - 96);
    me.game.world.addChild(this.ground1, 11);
    me.game.world.addChild(this.ground2, 11);

    this.HUD = new game.HUD.Container();
    me.game.world.addChild(this.HUD, 11);

    this.bird = me.pool.pull('clumsy', 60, me.game.viewport.height / 2 - 100);
    me.game.world.addChild(this.bird, 10);

    //inputs
    me.input.bindPointer(me.input.pointer.LEFT, me.input.KEY.SPACE);

    this.getReady = new me.Sprite(me.game.viewport.width / 2, me.game.viewport.height / 2, {
      image: 'getready',
    });
    me.game.world.addChild(this.getReady, 11);

    const that = this;
    new me.Tween(this.getReady)
      .to({ alpha: 0 }, { duration: 2000, easing: me.Tween.Easing.Linear.None })
      .onComplete(function () {
        game.data.start = true;
        me.game.world.addChild(new game.PipeGenerator(), 0);
        me.game.world.removeChild(that.getReady);
      })
      .start();
  }

  onDestroyEvent() {
    me.audio.stop('theme');
    // free the stored instance
    this.HUD = null;
    this.bird = null;
    this.ground1 = null;
    this.ground2 = null;
    me.input.unbindKey(me.input.KEY.SPACE);
    me.input.unbindPointer(me.input.pointer.LEFT);
  }
};
