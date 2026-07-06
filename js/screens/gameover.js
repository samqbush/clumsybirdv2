import { me } from '../melon.js';
import { game } from '../game.js';

game.GameOverScreen = class GameOverScreen extends me.Stage {
  onResetEvent() {
    //save section
    this.savedData = {
      score: game.data.score,
      steps: game.data.steps,
    };
    me.save.add(this.savedData);

    if (!me.save.topSteps) me.save.add({ topSteps: game.data.steps });
    if (game.data.steps > me.save.topSteps) {
      me.save.topSteps = game.data.steps;
      game.data.newHiScore = true;
    }
    me.input.bindKey(me.input.KEY.ENTER, 'enter', true);
    me.input.bindKey(me.input.KEY.SPACE, 'enter', false);
    me.input.bindPointer(me.input.pointer.LEFT, me.input.KEY.ENTER);

    this.unsubscribeKeydown = me.event.on(me.event.KEYDOWN, function (action) {
      if (action === 'enter') {
        me.state.change(me.state.MENU);
      }
    });

    me.game.world.addChild(
      new me.Sprite(me.game.viewport.width / 2, me.game.viewport.height / 2 - 100, {
        image: 'gameover',
      }),
      12,
    );

    const gameOverBG = new me.Sprite(me.game.viewport.width / 2, me.game.viewport.height / 2, {
      image: 'gameoverbg',
    });
    me.game.world.addChild(gameOverBG, 10);

    me.game.world.addChild(new game.BackgroundLayer('bg', 1));

    // ground
    this.ground1 = me.pool.pull('ground', 0, me.game.viewport.height - 96);
    this.ground2 = me.pool.pull('ground', me.game.viewport.width, me.game.viewport.height - 96);
    me.game.world.addChild(this.ground1, 11);
    me.game.world.addChild(this.ground2, 11);

    // add the dialog with the game information
    if (game.data.newHiScore) {
      const newRect = new me.Sprite(gameOverBG.width / 2, gameOverBG.height / 2, { image: 'new' });
      me.game.world.addChild(newRect, 12);
    }

    this.dialog = new game.GameOverScreen.Dialog();
    me.game.world.addChild(this.dialog, 12);
  }

  onDestroyEvent() {
    // unregister the event
    this.unsubscribeKeydown();
    me.input.unbindKey(me.input.KEY.ENTER);
    me.input.unbindKey(me.input.KEY.SPACE);
    me.input.unbindPointer(me.input.pointer.LEFT);
    this.ground1 = null;
    this.ground2 = null;
    me.audio.stop('theme');
  }
};

game.GameOverScreen.Dialog = class Dialog extends me.Renderable {
  constructor() {
    super(0, 0, me.game.viewport.width / 2, me.game.viewport.height / 2);
    this.font = new me.Text(0, 0, {
      font: 'gamefont',
      size: 40,
      fillStyle: 'black',
      textAlign: 'left',
    });
    this.steps = 'Steps: ' + game.data.steps.toString();
    this.topSteps = 'Higher Step: ' + me.save.topSteps.toString();
  }

  draw(renderer) {
    const stepsText = this.font.measureText(this.steps);

    //steps
    this.font.pos.set(
      me.game.viewport.width / 2 - stepsText.width / 2 - 60,
      me.game.viewport.height / 2,
      0,
    );
    this.font.setText(this.steps);
    this.font.draw(renderer);

    //top score
    this.font.pos.set(
      me.game.viewport.width / 2 - stepsText.width / 2 - 60,
      me.game.viewport.height / 2 + 50,
      0,
    );
    this.font.setText(this.topSteps);
    this.font.draw(renderer);
  }
};
