import { me } from '../melon.js';
import { game } from '../game.js';

game.HUD = game.HUD || {};

game.HUD.Container = class HUDContainer extends me.Container {
  constructor() {
    super();
    // persistent across level change
    this.isPersistent = true;

    // non collidable
    this.collidable = false;

    // make sure our object is always draw first
    this.z = Infinity;

    // give a name
    this.name = 'HUD';

    // add our child score object at the top left corner
    this.addChild(new game.HUD.ScoreItem(5, 5));
  }
};

game.HUD.ScoreItem = class ScoreItem extends me.Renderable {
  constructor(x, y) {
    super(x, y, 10, 10);

    // v19: me.Font is gone; me.Text is a self-drawing renderable. We keep this
    // custom Renderable wrapper (so the draw position/logic is unchanged) and
    // drive an internal me.Text for the actual glyph rendering.
    this.stepsFont = new me.Text(0, 0, {
      font: 'gamefont',
      size: 80,
      fillStyle: '#000',
      textAlign: 'center',
    });

    // make sure we use screen coordinates
    this.floating = true;
  }

  draw(renderer) {
    if (game.data.start && me.state.isCurrent(me.state.PLAY)) {
      this.stepsFont.pos.set(me.game.viewport.width / 2, 10, 0);
      this.stepsFont.setText(game.data.steps);
      this.stepsFont.draw(renderer);
    }
  }
};

game.BackgroundLayer = class BackgroundLayer extends me.ImageLayer {
  constructor(image, z) {
    super(0, 0, {
      name: image,
      width: 900,
      height: 600,
      image: image,
      z: z,
      ratio: 1,
    });
  }

  update() {
    if (me.input.isKeyPressed('mute')) {
      game.data.muted = !game.data.muted;
      if (game.data.muted) {
        me.audio.disable();
      } else {
        me.audio.enable();
      }
    }
    return true;
  }
};
