module ICanHasAnonymousModule {
    "use strict";

    // Value of square root of 2
    const SQRT2 = Math.sqrt(2);
    // Value of pi times 2
    const TWO_PI = 2*Math.PI;

    // Application entry point.
    function main(): void {
        const canvas = <HTMLCanvasElement> document.getElementById("game-canvas");
        const graphics = new Graphics(canvas.getContext("2d"));

        let firstTick = true;
        let lastTime: number;
        // The game loop which handles the timing of the game.
        function gameLoop(now: number): void {
            if (firstTick) {
                firstTick = false;
                lastTime = now;

                // Initialize the game in the first game loop tick.
                Input.init(canvas);
                Game.init();
                return;
            }

            // Calculate elapsed time
            let elapsedSeconds = (now - lastTime)/1000;
            lastTime = now;

            if (elapsedSeconds > 0.1) {
                // If the game is running at a REALLY low frame rate
                // then it will be unplayable regardless of anything
                // else. However, if the elapsed time is exceedingly
                // large, it might make the game break in unexpected
                // ways - this avoids such problems.
                elapsedSeconds = 0.1;
            }

            // Update the game
            Game.update(elapsedSeconds);
            // Render the next frame
            Game.render(graphics);

            // Update the input manager (must be done after the update).
            Input.update();
        }

        // Start the game loop
        function timer(now: number): void {
            requestAnimationFrame(timer);
            gameLoop(now);
        }

        requestAnimationFrame(timer);
    }

    // Main game object, handles the overall state of the game.
    module Game {
        // Width and of the game area, in pixels.
        export const WIDTH = 800;
        // Height of the game area, in pixels.
        export const HEIGHT = 600;

        let currentState: State;

        // Used by the FPS display
        let frameTime = 0;
        let frameCounter = 0;
        let frameRate = "?";

        // Initializes the game.
        export function init(): void {
            setState(new MainMenu());

            BackgroundEffects.fillScreen();
        }

        // Sets the state of the game.
        export function setState(newState: State): void {
            currentState = newState;
        }

        // Updates the logic of the game.
        export function update(elapsedSeconds: number): void {
            // Update current state
            currentState.update(elapsedSeconds);

            // Update effects
            Effects.update(elapsedSeconds);
            BackgroundEffects.update(elapsedSeconds);

            // Update the FPS counter
            frameTime += elapsedSeconds;
            frameCounter++;
        }

        // Renders the next frame of the game.
        export function render(g: Graphics): void {
            // Clear last frame residues
            g.clear();

            // Render effects
            BackgroundEffects.render(g);
            Effects.render(g);

            // Render the current state
            currentState.render(g);

            // Draw the FPS counter
            if (frameTime >= 1) {
                frameRate = "" + Math.ceil(frameCounter/frameTime);
                frameTime = 0;
                frameCounter = 0;
            }
            g.drawText(frameRate, 4, 17, "white", "18px arial");
        }
    }

    // Represents a basic state in the game's state machine.
    interface State {
        // Updates the state.
        update(elapsedSeconds: number): void;
        // Renders the state.
        render(g: Graphics): void;
    }

    // The main-menu state.
    class MainMenu implements State {
        // Updates the main menu.
        public update(elapsedSeconds: number): void {
            if (Input.justPressed(KeyCode.ENTER)) {
                Game.setState(new GameState());
            }
        }

        // Renders the main menu.
        public render(g: Graphics): void {
            g.drawTextCentered("Press [ENTER] to start the game.", Game.WIDTH/2, 200, "white", "24px arial");
        }
    }

    class GameOverMenu implements State {
        // Override
        public update(elapsedSeconds: number): void {
            if (Input.justPressed(KeyCode.ENTER)) {
                Game.setState(new MainMenu());
            }
        }

        // Override
        public render(g: Graphics): void {
            g.drawTextCentered("Game over.", Game.WIDTH/2, 200, "white", "18px arial");
            g.drawTextCentered("Press [ENTER] to return to the main menu.", Game.WIDTH/2, 230, "white", "24px arial");
        }
    }

    // Presented to the player while the game is paused.
    class PauseMenu implements State {
        // Updates the pause menu.
        public update(elapsedSeconds: number): void {
            if (Input.isKeyDown(KeyCode.SPACE)) {

            }
        }

        // Renders the pause menu.
        public render(g: Graphics): void {
            g.fillRect(0, 0, Game.WIDTH, Game.HEIGHT, "rgba(0, 0, 0, 0.4)");
            g.drawTextCentered("Press [P] to unpause the game.", Game.WIDTH/2, 200, "white", "24px arial");
        }
    }

    // This state manages the actual game itself.
    class GameState implements State {
        // The player entity.
        private player = new Player();
        // List of bullets currently in the game.
        private bullets = new EntityList<Bullet>();

        // List of warpgates currently in the game.
        private warpgates = new EntityList<Warpgate>();
        // List of enemies currently in the game.
        private enemies = new EntityList<Enemy>();
        // List of bullets fired by enemies.
        private enemyBullets = new EntityList<EnemyBullet>();

        // Determines how often enemies spawn.
        private static ENEMY_SPAWN_INTERVAL = 2;
        // Timer used to spawn enemies.
        private enemySpawnTimer = 0;

        private paused = false;

        // Add a bullet to the game.
        public addBullet(bullet: Bullet): void {
            this.bullets.add(bullet);
        }

        // Add an enemy to the game.
        public addEnemy(enemy: Enemy): void {
            this.enemies.add(enemy);
        }

        // Adds an enemy bullet to the game.
        public addEnemyBullet(enemyBullet: EnemyBullet): void {
            this.enemyBullets.add(enemyBullet);
        }

        // Gets the player entity.
        public getPlayer(): Player {
            return this.player;
        }

        // Updates the game state.
        public update(elapsedSeconds: number): void {
            if (Input.justPressed(KeyCode.P)) {
                this.paused = !this.paused;
            }
            if (this.paused) {
                return;
            }

            // Update player
            this.player.update(elapsedSeconds, this);
            // Update player bullets
            this.bullets.updateAll(elapsedSeconds, this);

            // Spawn enemies
            this.enemySpawnTimer += elapsedSeconds;
            while (this.enemySpawnTimer > GameState.ENEMY_SPAWN_INTERVAL) {
                this.enemySpawnTimer -= GameState.ENEMY_SPAWN_INTERVAL;
                this.warpgates.add(new Warpgate(this.player));
            }
            // Update warpgates
            this.warpgates.updateAll(elapsedSeconds, this);
            // Update enemies
            this.enemies.updateAll(elapsedSeconds, this);
            // Update enemy bullets
            this.enemyBullets.updateAll(elapsedSeconds, this);

            // Collisions
            this.bullets.collideAll(this.enemies, (bullet, enemy) => {
                bullet.kill();
                enemy.takeDamage();
                enemy.vx += bullet.vx/12;
                enemy.vy += bullet.vy/12;
            });
            this.bullets.collideAll(this.enemyBullets, (bullet, enemyBullet) => {
                bullet.kill();
                enemyBullet.kill();
            });
            this.enemyBullets.collideWithOne(this.player, (bullet, player) => {
                bullet.kill();
                player.kill();
            });
            this.enemies.collideWithOne(this.player, (enemy, player) => {
                enemy.takeDamage();
                player.kill();
            });

            // Game over
            if (!this.player.alive) {
                Game.setState(new GameOverMenu());
            }
        }

        // Renders the game state.
        public render(g: Graphics): void {
            // Render entities
            this.bullets.renderAll(g);
            this.enemies.renderAll(g);
            this.warpgates.renderAll(g);
            this.enemyBullets.renderAll(g);
            this.player.render(g);

            if (this.paused) {
                g.fillRect(0, 0, Game.WIDTH, Game.HEIGHT, "rgba(0, 0, 0, 0.4)");
                g.drawTextCentered("Press [P] to unpause the game.", Game.WIDTH/2, 200, "white", "18px arial");
            }
        }
    }

    // Base class for game entities.
    class Entity {
        // Indicates the current state of the entity; whether its alive of dead.
        public alive: boolean = true;
        // X-coordinate of the entity's position,
        public x: number = 0;
        // Y-coordinate of the entity's position,
        public y: number = 0;
        // This dictates both the visual size and the collision size of the entity.
        protected radius: number = 25;

        // Updates the state of the entity.
        public update(elapsedSeconds: number, gs: GameState): void {
        }

        // Kills the entity.
        public kill(): void {
            this.alive = false;
            this.onDeath();
        }

        // Invoked when the enemy is killed.
        protected onDeath(): void {
        }

        // Renders the visuals of the entity.
        public render(g: Graphics): void {
            g.fillCircle(this.x, this.y, this.radius, "magenta");
        }

        // Checks whether this entity collides with another entity.
        public collidesWith(other: Entity): boolean {
            const dx = this.x - other.x;
            const dy = this.y - other.y;
            const distSqrd = dx*dx + dy*dy;
            const touchRadius = this.radius + other.radius;

            return (distSqrd <= touchRadius*touchRadius);
        }
    }

    // A collection of entities.
    class EntityList<T extends Entity> {
        // Internally stores the entities.
        private entities: T[] = [];

        // Adds an entity to this list.
        public add(entity: T): void {
            if (!(entity instanceof Entity)) {
                throw new Error("Invalid entity.");
            }
            if (this.entities.indexOf(entity) !== -1) {
                throw new Error("Duplicate entities not allowed.");
            }
            this.entities.push(entity);
        }

        // Updates all the entities in this list, removing entities that have died.
        public updateAll(elapsedSeconds: number, gs: GameState): void {
            let entities = this.entities;
            for (let i = 0; i < entities.length; i++) {
                let entity: T = entities[i];
                entity.update(elapsedSeconds, gs);
                if (!entity.alive) {
                    entities.splice(i, 1);
                    i--;
                }
            }
        }

        // Renders all the entities in this list.
        public renderAll(g: Graphics): void {
            let entities = this.entities;
            for (let i = 0; i < entities.length; i++) {
                entities[i].render(g);
            }
        }

        // Performs collision checks between all the entities in this list and
        // all the entities of another list. When a collision is detected the
        // 'onCollide' function will be invoked, with the two colliding entities
        // passed to it as the two arguments.
        public collideAll<TOther extends Entity>(list: EntityList<TOther>, onCollide: (a: T, b: TOther)=>void) {
            const entities = this.entities;
            if (entities.length === 0) {
                return;
            }

            const otherEntities = list.entities;
            if (otherEntities.length === 0) {
                return;
            }

            for (let i = 0; i < entities.length; i++) {
                const a: T = entities[i];
                for (let k = 0; k < otherEntities.length; k++) {
                    if (!a.alive) {
                        // Entity 'a' possibly just died from hitting something,
                        // this check prevents dead entities from colliding with
                        // living entities in the same frame that it died.
                        break;
                    }

                    const b: TOther = otherEntities[k];
                    if (!b.alive) {
                        // Pretty much the same as the first check; this prevents
                        // dead entities from affecting living entities.
                        continue;
                    }

                    if (a.collidesWith(b)) {
                        // A collision is detected!
                        onCollide(a, b);
                    }
                }
            }
        }

        // Performs collision checks between all the entities in this list and
        // another single entity.
        public collideWithOne<TOther extends Entity>(other: TOther, onCollide: (a: T, b: TOther)=>void) {
            const entities = this.entities;

            for (var i = 0; i < entities.length; i++) {
                if (!other.alive) {
                    // Other entity is dead, no point of checking further
                    break;
                }

                var a: T = entities[i];
                if (!a.alive) {
                    continue;
                }

                if (a.collidesWith(other)) {
                    // Collision detected
                    onCollide(a, other);
                }
            }
        }
    }

    // The player entity which is controlled by the actual player.
    class Player extends Entity {
        // Speed of the player.
        private static SPEED = 400;
        // Minimum amount of time between attacks.
        private static ATTACK_COOLDOWN = 0.12;
        // Cooldown of the Nova ability.
        private static NOVA_COOLDOWN = 5;
        // Number of bullets released by the Nova ability.
        private static NOVA_BULLET_COUNT = 48;

        // Used to enforce player attack cooldown.
        private attackTimer: number = 0;
        // Used for the Nova ability cooldown.
        private novaTimer: number = 0;

        constructor() {
            super();

            // Position the player at the center of the game area.
            this.x = Game.WIDTH/2;
            this.y = Game.HEIGHT/2;
        }

        // Updates the logic of the player.
        public update(elapsedSeconds: number, gs: GameState): void {
            // Keyboard movement
            const speedDelta = Player.SPEED*elapsedSeconds;
            let vx = 0;
            let vy = 0;
            if (Input.isKeyDown(KeyCode.LEFT_ARROW, KeyCode.A)) {
                vx -= speedDelta;
            }
            if (Input.isKeyDown(KeyCode.RIGHT_ARROW, KeyCode.D)) {
                vx += speedDelta;
            }
            if (Input.isKeyDown(KeyCode.UP_ARROW, KeyCode.W)) {
                vy -= speedDelta;
            }
            if (Input.isKeyDown(KeyCode.DOWN_ARROW, KeyCode.S)) {
                vy += speedDelta;
            }

            // Diagonal movement
            if (vx !== 0 && vy !== 0) {
                // This avoids the player from moving quicker
                // overall when moving diagonally.
                vx /= SQRT2;
                vy /= SQRT2;
            }

            // Apply velocity
            this.x += vx;
            this.y += vy;

            // Prevent the player entity from leaving the game area
            const r = this.radius;
            const leftBorder = r;
            const rightBorder = Game.WIDTH - r;
            const topBorder = r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x < leftBorder) {
                this.x = leftBorder;
            } else if (this.x > rightBorder) {
                this.x = rightBorder;
            }
            if (this.y < topBorder) {
                this.y = topBorder;
            } else if (this.y > bottomBorder) {
                this.y = bottomBorder;
            }

            // Attack
            this.attackTimer -= elapsedSeconds;
            if (this.attackTimer <= 0 && Input.lmb) {
                this.attackTimer = Player.ATTACK_COOLDOWN;
                // Create a new bullet
                gs.addBullet(new Bullet(this.x, this.y, Input.mouseX, Input.mouseY));
            }

            // Nova ability
            this.novaTimer -= elapsedSeconds;
            if (this.novaTimer <= 0 && Input.isKeyDown(KeyCode.SPACE)) {
                this.novaTimer = Player.NOVA_COOLDOWN;

                const angleDelta = TWO_PI/Player.NOVA_BULLET_COUNT;
                let movementAngle = 0;
                for (let i = 0; i < Player.NOVA_BULLET_COUNT; i++) {
                    // Calculate the movement angle of each bullet
                    const tx = this.x + Math.sin(movementAngle);
                    const ty = this.y + Math.cos(movementAngle);
                    // Create a bullet
                    gs.addBullet(new Bullet(this.x, this.y, tx, ty));

                    // Increment angle for next bullet
                    movementAngle += angleDelta;
                }
            }
        }

        // Make the player death seem dramatic.
        protected onDeath(): void {
            Effects.explode(this.x, this.y, 200, "green", 3);
        }

        // Renders the visuals of the player.
        public render(g: Graphics): void {
            g.fillCircle(this.x, this.y, this.radius, "green");
        }
    }

    // A bullet fired by the player.
    class Bullet extends Entity {
        // Speed of the bullet.
        private static SPEED: number = 800;

        // Indicates whether the bullet has already bounced off the border once.
        // This is used to ensure that the bullet bounces once, and then dies
        // when it hits some border again.
        private bounced: boolean = false;
        // X-component of the bullet's velocity.
        public vx: number;
        // Y-component of the bullet's velocity.
        public vy: number;

        constructor(x: number, y: number, targetX: number, targetY: number) {
            super();

            this.x = x;
            this.y = y;
            this.radius = 6;

            // Calculate velocity of bullet so that it moves
            // towards the target coordinate at the required
            // speed.
            const dx = targetX - x;
            const dy = targetY - y;
            const dd = Bullet.SPEED/Math.sqrt(dx*dx + dy*dy);
            // X-component of the bullet's velocity.
            this.vx = dx*dd;
            // Y-component of the bullet's velocity.
            this.vy = dy*dd;
        }

        // Updates the state of the bullet.
        public update(elapsedSeconds: number): void {
            // Movement
            this.x += (this.vx*elapsedSeconds);
            this.y += (this.vy*elapsedSeconds);

            // Bullet touches the border of the game area.
            // First touch - bounce.
            // Second touch - bullet dies.
            //
            // Note: The current implementation allows the bullet
            // to bounce completely backwards if it hits a corner
            // and both vertical and horizontal borders are crossed
            // at the same time. This doesn't really detract from
            // the game, so for now a fix is not required.
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            let outside = false;
            if (this.x <= leftBorder) {
                // left
                if (this.vx < 0) {
                    this.vx *= -1;
                    this.x = leftBorder*2 - this.x;
                    outside = true;
                }
            } else if (this.x >= rightBorder) {
                // right
                if (this.vx > 0) {
                    this.vx *= -1;
                    this.x = rightBorder*2 - this.x;
                    outside = true;
                }
            }
            if (this.y <= topBorder) {
                // top
                if (this.vy < 0) {
                    this.vy *= -1;
                    this.y = topBorder*2 - this.y;
                    outside = true;
                }
            } else if (this.y >= bottomBorder) {
                // bottom
                if (this.vy > 0) {
                    this.vy *= -1;
                    this.y = bottomBorder*2 - this.y;
                    outside = true;
                }
            }
            if (outside) {
                if (this.bounced) {
                    this.kill();
                } else {
                    this.bounced = true;
                }
            }
        }

        // Add a bullet death effect.
        protected onDeath(): void {
            Effects.explode(this.x, this.y, 10, "yellow", 1);
        }

        // Renders the visuals of the bullet.
        public render(g: Graphics): void {
            const ctx = g.ctx;
            ctx.fillStyle = "yellow";

            const x = this.x;
            const y = this.y;
            const width = 3;
            const height = 20;
            const angle = Math.atan2(this.vx, -this.vy);
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.fillRect(-width/2, -height/2, width, height);
            ctx.rotate(-angle);
            ctx.translate(-x, -y);
        }
    }

    // An enemy entity the player must defeat.
    class Enemy extends Entity {
        // Determines how much smaller the enemy is after getting hit once (percentage).
        private static HIT_SIZE_FACTOR = 0.92;
        // Amount of time the visual hit effect lasts.
        private static HIT_EFFECT_TIME = 0.06;
        // The speed at which the enemy starts at.
        private static START_SPEED = 60;
        // Determines how often the enemy attacks.
        private static ATTACK_COOLDOWN = 3;

        // Current health of the enemy.
        private health: number = 8;
        // X-component of the enemy's velocity.
        public vx: number;
        // Y-component of the enemy's velocity.
        public vy: number;

        // Used for the attack cooldown.
        private attackTimer: number = ut.rand(Enemy.ATTACK_COOLDOWN*0.5, Enemy.ATTACK_COOLDOWN*1.5);
        // Used to time the hit effect visual.
        private hitTimer: number = 0;

        constructor(x: number, y: number) {
            super();

            this.radius = 40;
            this.x = x;
            this.y = y;

            // Movement at a random direction.
            const speed = Enemy.START_SPEED;
            const dir = ut.rand(0, TWO_PI);
            this.vx = Math.sin(dir)*speed;
            this.vy = Math.cos(dir)*speed;
        }

        // Makes the enemy take 1 damage.
        public takeDamage(): void {
            // Lose health
            this.health--;
            // Reduce size
            this.radius *= Enemy.HIT_SIZE_FACTOR;

            if (this.health > 0) {
                // Hit effect
                this.hitTimer = Enemy.HIT_EFFECT_TIME;
            } else {
                // x_x
                this.kill();
            }
        }

        // Add a nice effect when the enemy dies.
        protected onDeath(): void {
            Effects.explode(this.x, this.y, 80, "orange", 1.3);
        }

        // Update the logic of the enemy.
        public update(elapsedSeconds: number, gs: GameState): void {
            // Movement
            this.x += this.vx*elapsedSeconds;
            this.y += this.vy*elapsedSeconds;

            // Enemies bounce off the game border.
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x <= leftBorder) {
                if (this.vx < 0) {
                    // left
                    this.vx *= -1;
                    this.x = leftBorder*2 - this.x;
                }
            } else if (this.x >= rightBorder) {
                if (this.vx > 0) {
                    // right
                    this.vx *= -1;
                    this.x = rightBorder*2 - this.x;
                }
            }
            if (this.y <= topBorder) {
                if (this.vy < 0) {
                    // top
                    this.vy *= -1;
                    this.y = topBorder*2 - this.y;
                }
            } else if (this.y >= bottomBorder) {
                if (this.vy > 0) {
                    // bottom
                    this.vy *= -1;
                    this.y = bottomBorder*2 - this.y;
                }
            }

            // Attacking
            this.attackTimer -= elapsedSeconds;
            if (this.attackTimer <= 0) {
                this.attackTimer += Enemy.ATTACK_COOLDOWN;

                gs.addEnemyBullet(new EnemyBullet(this.x, this.y, gs.getPlayer()));
            }

            // Hit effect timer
            this.hitTimer -= elapsedSeconds;
        }

        // Render the visuals of the enemy.
        public render(g: Graphics): void {
            const color = (this.hitTimer > 0) ? "red" : "orange";
            g.fillCircle(this.x, this.y, this.radius, color);
        }
    }

    class EnemyBullet extends Entity {
        private static SPEED: number = 180;
        private speedFactor = -1;
        private vx: number;
        private vy: number;

        constructor(x: number, y: number, target: Entity) {
            super();

            this.radius = 12;
            this.x = x;
            this.y = y;

            const dx = target.x - x;
            const dy = target.y - y;
            const dd = EnemyBullet.SPEED/Math.sqrt(dx*dx + dy*dy);
            // X-component of the bullet's velocity.
            this.vx = dx*dd;
            // Y-component of the bullet's velocity.
            this.vy = dy*dd;
        }

        protected onDeath(): void {
            Effects.explode(this.x, this.y, 16, "red", 1.1);
        }

        public update(elapsedSeconds: number, gs: GameState): void {
            // Movement
            this.speedFactor += elapsedSeconds*1.4;
            this.x += this.speedFactor*(this.vx*elapsedSeconds);
            this.y += this.speedFactor*(this.vy*elapsedSeconds);

            if (this.speedFactor <= 1) {
                return;
            }

            // Border collision
            const r = this.radius;
            const leftBorder = r;
            const topBorder = r;
            const rightBorder = Game.WIDTH - r;
            const bottomBorder = Game.HEIGHT - r;
            if (this.x <= leftBorder || this.x >= rightBorder || this.y <= topBorder || this.y >= bottomBorder) {
                this.kill();
            }
        }

        public render(g: Graphics): void {
            g.fillCircle(this.x, this.y, this.radius, "red");
        }
    }

    // The Warpgate serves as a warning sign before an enemy is spawned at its
    // its location.
    class Warpgate extends Entity {
        // The initial size of the warpgate.
        private static INITIAL_SIZE = 40;
        // Lifetime of of the warpgate.
        private static LIFETIME = 1.5;
        // Minimum distance from the player that the warpgate can spawn, squared.
        private static PLAYER_SAFE_DISTANCE_SQR = 200*200;

        // Time left before the warpgate disappears and an enemy spawns.
        private timeLeft: number;

        constructor(player: Player) {
            super();

            const r = Warpgate.INITIAL_SIZE;
            const px = player["x"];
            const py = player["y"];
            // Create the warp gate at a random place
            // within the bounds of the game-area and
            // far enough from the player.
            let x: number, y: number;
            let dx: number, dy: number;
            do {
                x = ut.randInt(r, Game.WIDTH - r);
                y = ut.randInt(r, Game.HEIGHT - r);
                dx = px - x;
                dy = py - y;
            } while (dx*dx + dy*dy < Warpgate.PLAYER_SAFE_DISTANCE_SQR);
            this.x = x;
            this.y = y;

            this.timeLeft = Warpgate.LIFETIME;
        }

        // Update the warpgate.
        public update(elapsedSeconds: number, gs: GameState): void {
            this.timeLeft -= elapsedSeconds;
            if (this.timeLeft <= 0) {
                this.alive = false;
                gs.addEnemy(new Enemy(this.x, this.y));
            }
        }

        // Render the warpgate.
        public render(g: Graphics): void {
            const radius = Warpgate.INITIAL_SIZE*(this.timeLeft/Warpgate.LIFETIME);
            g.drawCircle(this.x, this.y, radius, "#cc00ff", 8);
        }
    }

    // Manages the visual effects of the game.
    module Effects {
        // Lifetime range of particles.
        const MIN_LIFETIME = 0.3, MAX_LIFETIME = 0.7;
        // Speed range of particles
        const MIN_SPEED = 40, MAX_SPEED = 300;
        // Size range of the particles.
        const MIN_SIZE = 1, MAX_SIZE = 5;

        // A single particle used in particle effects.
        class Particle {
            // Time left until the particle disappears.
            public lifetime: number;
            // Size of the particle
            public size: number;
            // X-position of the particle.
            public x: number;
            // Y-position of the particle.
            public y: number;
            // Color of the particle.
            public color: string;
            // X-component of the particle's velocity.
            public vx: number;
            // Y-component of the particle's velocity.
            public vy: number;

            // Updates the state of the particle.
            public update(elapsedSeconds: number): boolean {
                // Lifetime
                this.lifetime -= elapsedSeconds;

                if (this.lifetime <= 0) {
                    // Particle ran out of time.
                    return false;
                }

                // Movement
                this.x += this.vx*elapsedSeconds;
                this.y += this.vy*elapsedSeconds;

                // Bounce off borders
                const r = this.size;
                const leftBorder = r;
                const topBorder = r;
                const rightBorder = Game.WIDTH - r;
                const bottomBorder = Game.HEIGHT - r;
                if (this.x <= leftBorder) {
                    if (this.vx < 0) {
                        // left
                        this.vx *= -1;
                        this.x = leftBorder*2 - this.x;
                    }
                } else if (this.x >= rightBorder) {
                    if (this.vx > 0) {
                        // right
                        this.vx *= -1;
                        this.x = rightBorder*2 - this.x;
                    }
                }
                if (this.y <= topBorder) {
                    if (this.vy < 0) {
                        // top
                        this.vy *= -1;
                        this.y = topBorder*2 - this.y;
                    }
                } else if (this.y >= bottomBorder) {
                    if (this.vy > 0) {
                        // bottom
                        this.vy *= -1;
                        this.y = bottomBorder*2 - this.y;
                    }
                }

                // Particle still lives
                return true;
            }
        }

        // Currently active particles.
        const activeParticles: Particle[] = [];
        // Dead particles that can be recycled later.
        const deadParticles: Particle[] = [];

        // Spawns multiple, randomly moving particles at the target location,
        // simulation an explosion.
        // The `intensity` argument affects how powerful the explosion is,
        // with values higher than 1 increasing the upper limits of the
        // lifetime, size, and speed of each particle and values lower than one
        // have the reverse effect.
        export function explode(x: number, y: number, particleCount: number, color: string, intensity: number, direction?: number): void {
            for (let i = 0; i < particleCount; i++) {
                let ptc: Particle;
                // Create or recycle a particle.
                if (deadParticles.length > 0) {
                    ptc = deadParticles.pop();
                } else {
                    ptc = new Particle();
                }

                // Set particle position, color, lifetime, and size.
                ptc.x = x;
                ptc.y = y;
                ptc.color = color;
                ptc.lifetime = ut.rand(MIN_LIFETIME, MAX_LIFETIME*intensity);
                ptc.size = ut.randInt(MIN_SIZE, (MAX_SIZE + 1)*intensity);

                // Move in a random direction and at a random speed.
                const speed = ut.rand(MIN_SPEED, MAX_SPEED*intensity);
                let dir: number;
                if (typeof direction === 'number') {
                    dir = ut.rand(direction - 0.3, direction + 0.3);
                } else {
                    dir = ut.rand(0, TWO_PI);
                }
                ptc.vx = Math.sin(dir)*speed;
                ptc.vy = Math.cos(dir)*speed;

                // Add to active particle list.
                activeParticles.push(ptc);
            }
        }

        // Updates the effects.
        export function update(elapsedSeconds: number): void {
            const particles = activeParticles;
            for (let i = 0; i < particles.length; i++) {
                const ptc = particles[i];
                // Update
                const alive = ptc.update(elapsedSeconds);

                if (!alive) {
                    // Particle died; remove it from the active list
                    // and add it to the dead list so that it can be
                    // recycled at a later point.
                    particles.splice(i, 1);
                    i--;
                    deadParticles.push(ptc);
                }
            }
        }

        // Renders the effects.
        export function render(g: Graphics): void {
            const particles = activeParticles;
            for (let i = 0; i < particles.length; i++) {
                const ptc = particles[i];
                const size = ptc.size;

                // Render the particle as a simple square
                g.fillRect(ptc.x - size/2, ptc.y - size/2, size, size, ptc.color);
            }
        }
    }

    // Manages the background effects specifically.
    module BackgroundEffects {
        // Represents a single dust particle that flies through the background.
        interface DustParticle {
            // X-position of the particle.
            x: number;
            // Y-position of the particle.
            y: number;
            // Movement speed of the particle.
            speed: number;
            // Size of the particle.
            size: number;
            // Color of the particle.
            color: string;
        }

        const MIN_SPEED = 4;
        const MAX_SPEED = 40;
        const SPAWN_INTERVAL = 0.06;

        const deadDust: DustParticle[] = [];
        const activeDust: DustParticle[] = [];
        let dustTimer = 0;

        const COLORS: string[] = [
            "#a3a",
            "#a33",
            "#666", "#666", "#666", "#666", "#666", "#666", "#666", "#666",
            "#777", "#777", "#777", "#777", "#777", "#777", "#777", "#777",
            "#888", "#888", "#888", "#888", "#888", "#888", "#888", "#888",
            "#999", "#999", "#999", "#999", "#999", "#999", "#999",
            "#aaa", "#aaa", "#aaa", "#aaa", "#aaa", "#aaa",
            "#bbb", "#bbb", "#bbb", "#bbb", "#bbb",
            "#ccc", "#ccc", "#ccc", "#ccc",
            "#ddd", "#ddd", "#ddd",
        ];

        // Create/recycle a dust particle.
        function createDustParticle(): void {
            let ptc: DustParticle;
            if (deadDust.length > 0) {
                ptc = deadDust.pop();
            } else {
                ptc = <DustParticle> {};
            }

            // Randomize the size of the particle
            let size: number;
            const seed = Math.random();
            if (seed < 0.93) {
                size = 1;
            } else if (seed < 0.99) {
                size = 2;
            } else {
                size = 3;
            }
            ptc.size = size;

            // Position randomly before the left border of the screen.
            ptc.x = -size;
            ptc.y = ut.rand(-size, Game.HEIGHT);

            // Particle speed
            ptc.speed = ut.rand(MIN_SPEED, MAX_SPEED);
            // Color
            ptc.color = ut.randElem(COLORS);

            activeDust.push(ptc);
        }

        // Fills the screen with dust particles.
        export function fillScreen(): void {
            for (let i = 0; i < Game.WIDTH/MIN_SPEED; i++) {
                update(1);
            }
        }

        // Updates the background effects.
        export function update(elapsedSeconds: number): void {
            // Create new dust particles, if its time
            dustTimer += elapsedSeconds;
            while (dustTimer >= SPAWN_INTERVAL) {
                dustTimer -= SPAWN_INTERVAL;
                createDustParticle();
            }

            // Update currently active particles
            const active = activeDust;
            for (let i = 0; i < active.length; i++) {
                const ptc = active[i];
                ptc.x += ptc.speed*elapsedSeconds;
                if (ptc.x > Game.WIDTH) {
                    active.splice(i, 1);
                    i--;
                    deadDust.push(ptc);
                }
            }
        }

        // Renders the background effects.
        export function render(g: Graphics): void {
            // <high performance area>
            const ctx = g.ctx;
            const active = activeDust;
            for (let i = 0; i < active.length; i++) {
                const ptc = active[i];
                const size = ptc.size;
                ctx.fillStyle = ptc.color;
                ctx.fillRect(ptc.x, ptc.y, size, size);
            }
        }
    }

    // Contains various utility methods.
    module ut {
        // Generates a random integer between `min` (inclusive) and `max` (exclusive).
        export function randInt(min: number, max: number): number {
            return Math.floor(min + Math.random()*(max - min));
        }

        // Generates a random numeric value between `min` and `max`.
        export function rand(min: number, max: number): number {
            return min + Math.random()*(max - min);
        }

        // Returns a randomly selected element from an array.
        export function randElem<T>(array: T[]): T {
            return array[Math.floor(Math.random()*array.length)];
        }
    }

    // Allows drawing simple 2D graphics on a Canvas element.
    class Graphics {
        constructor(public ctx: CanvasRenderingContext2D) {
        }

        // Clears the entire drawing canvas.
        public clear(): void {
            this.ctx.clearRect(0, 0, Game.WIDTH, Game.HEIGHT);
        }

        // Fills a square shape.
        public fillRect(x: number, y: number, width: number, height: number, color: string): void {
            const ctx = this.ctx;
            ctx.fillStyle = color;
            ctx.fillRect(x, y, width, height);
        }

        // Fills a circle shape.
        public fillCircle(centerX: number, centerY: number, radius: number, color: string): void {
            const ctx = this.ctx;
            ctx.fillStyle = color;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, TWO_PI);
            ctx.fill();
        }

        // Draws the outline of a circle.
        public drawCircle(centerX: number, centerY: number, radius, color: string, lineWidth: number): void {
            const ctx = this.ctx;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, TWO_PI);
            ctx.stroke();
        }

        // Draws text.
        public drawText(text: string, x: number, y: number, color: string, font: string): void {
            const ctx = this.ctx;
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
        }

        public drawTextCentered(text: string, x: number, y: number, color: string, font: string): void {
            const ctx = this.ctx;
            ctx.font = font;
            ctx.fillStyle = color;
            const width = ctx.measureText(text).width;
            ctx.fillText(text, x - width/2, y);
        }
    }

    // Handles the keyboard and mouse input from the player.
    module Input {
        // Maximum key code kept track of by the Input manager.
        const MAX_KEY_CODE = 128;
        // Key states from the last frame.
        const prevKeys: boolean[] = new Array(MAX_KEY_CODE);
        // Current key states.
        const currentKeys: boolean[] = new Array(MAX_KEY_CODE);

        export var lmb: boolean = false;
        export var mouseX: number;
        export var mouseY: number;

        // The canvas element on which the game is drawn. A reference to this is
        // needed to properly calculate the position of the cursor relative to
        // the things in the game.
        let canvas: HTMLCanvasElement;

        // Initializes the Input manager.
        export function init(_canvas: HTMLCanvasElement): void {
            canvas = _canvas;

            // All the required keyboard and mouse listeners
            window.addEventListener("keydown", onKeyDown);
            window.addEventListener("keyup", onKeyUp);
            window.addEventListener("mousedown", onMouseDown);
            window.addEventListener("mouseup", onMouseUp);
            window.addEventListener("mousemove", onMouseMove);
        }

        // Updates the state of the Input manager. This must be called each frame
        // AFTER the game is updated. This is required to check when a key is
        // pressed for the first time in the current frame, as opposed to just
        // being held down by the player.
        export function update(): void {
            for (let i = 0; i < MAX_KEY_CODE; i++) {
                prevKeys[i] = currentKeys[i];
            }
        }

        // Returns true if at least one of the two specified keys (denoted by
        // their key codes) are down.
        export function isKeyDown(keyCode1: number, keyCode2?: number): boolean {
            if (keyCode1 >= 0 && keyCode1 < MAX_KEY_CODE) {
                if (currentKeys[keyCode1]) return true;
            }
            if (keyCode2 >= 0 && keyCode2 < MAX_KEY_CODE) {
                if (currentKeys[keyCode2]) return true;
            }
            return false;
        }

        // Checks whether a key has just been pressed in the current frame.
        export function justPressed(keyCode: number): boolean {
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                return currentKeys[keyCode] && !prevKeys[keyCode];
            }
            return false;
        }

        // Handles the 'keydown' keyboard event.
        function onKeyDown(e: KeyboardEvent): void {
            let keyCode = e.keyCode;
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                currentKeys[keyCode] = true;
            }
        }

        // Handles the 'keyup' keyboard event.
        function onKeyUp(e: KeyboardEvent): void {
            let keyCode = e.keyCode;
            if (keyCode >= 0 && keyCode < MAX_KEY_CODE) {
                currentKeys[keyCode] = false;
            }
        }

        // Handles the 'mousedown' mouse event.
        function onMouseDown(e: MouseEvent): void {
            if (e.button === 0) {
                lmb = true;
            }
        }

        // Handles the 'mouseup' mouse event.
        function onMouseUp(e: MouseEvent): void {
            if (e.button === 0) {
                lmb = false;
            }
        }

        // Handles the 'mousemove' mouse event.
        function onMouseMove(e: MouseEvent): void {
            mouseX = e.clientX - canvas.offsetLeft;
            mouseY = e.clientY - canvas.offsetTop;
        }
    }

    // Contains key-code constants for keyboard keys.
    enum KeyCode {
        LEFT_ARROW = 37,
        UP_ARROW = 38,
        RIGHT_ARROW = 39,
        DOWN_ARROW = 40,
        W = 87,
        A = 65,
        S = 83,
        D = 68,
        P = 80,
        SPACE = 32,
        ENTER = 13
    }

    // Start the game once everything is loaded.
    window.addEventListener("load", main);
}