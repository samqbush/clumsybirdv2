import { me } from '../melon.js';
import { game } from '../game.js';

game.TitleScreen = class TitleScreen extends me.Stage {
  onResetEvent() {
    me.audio.stop('theme');
    game.data.newHiScore = false;

    me.game.world.addChild(new game.BackgroundLayer('bg', 1));
    me.input.bindKey(me.input.KEY.ENTER, 'enter', true);
    me.input.bindKey(me.input.KEY.SPACE, 'enter', true);
    me.input.bindPointer(me.input.pointer.LEFT, me.input.KEY.ENTER);

    // v19: me.event.subscribe -> me.event.on, which RETURNS an unsubscribe fn.
    this.unsubscribeKeydown = me.event.on(me.event.KEYDOWN, function (action) {
      if (action === 'enter') {
        me.state.change(me.state.PLAY);
      }
    });

    //logo
    this.logo = new me.Sprite(me.game.viewport.width / 2, me.game.viewport.height / 2 - 20, {
      image: 'logo',
    });
    me.game.world.addChild(this.logo, 10);

    new me.Tween(this.logo.pos)
      .to(
        { y: me.game.viewport.height / 2 - 100 },
        { duration: 1000, easing: me.Tween.Easing.Exponential.InOut },
      )
      .start();

    this.ground1 = me.pool.pull('ground', 0, me.game.viewport.height - 96);
    this.ground2 = me.pool.pull('ground', me.game.viewport.width, me.game.viewport.height - 96);
    me.game.world.addChild(this.ground1, 11);
    me.game.world.addChild(this.ground2, 11);

    me.game.world.addChild(new game.TitleScreen.Instructions(), 12);
  }

  onDestroyEvent() {
    // unregister the event
    this.unsubscribeKeydown();
    me.input.unbindKey(me.input.KEY.ENTER);
    me.input.unbindKey(me.input.KEY.SPACE);
    me.input.unbindPointer(me.input.pointer.LEFT);
    this.ground1 = null;
    this.ground2 = null;
    me.game.world.removeChild(this.logo);
    this.logo = null;
  }
};

game.TitleScreen.Instructions = class Instructions extends me.Renderable {
  constructor() {
    // size does not matter, it's just to avoid having a zero size renderable
    super(0, 0, 100, 100);
    this.text = me.device.touch
      ? 'Tap to start'
      : 'PRESS SPACE OR CLICK LEFT MOUSE BUTTON TO START \n\t\t\t\t\t\t\t\t\t\t\tPRESS "M" TO MUTE SOUND';
    this.font = new me.Text(0, 0, { font: 'gamefont', size: 20, fillStyle: '#000' });
  }

  draw(renderer) {
    const measure = this.font.measureText(this.text);
    const xpos = me.game.viewport.width / 2 - measure.width / 2;
    const ypos = me.game.viewport.height / 2 + 50;
    this.font.pos.set(xpos, ypos, 0);
    this.font.setText(this.text);
    this.font.draw(renderer);
  }
};
