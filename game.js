'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  plus(vector) { 
    if(!(vector instanceof Vector)) {
      throw new Error ('Можно прибавлять к вектору только вектор типа Vector');
    } else {
      return new Vector(this.x + vector.x, this.y + vector.y ); 
    }
  }
  
  times(factor = 1) { 
    return new Vector(this.x * factor, this.y * factor); 
  }
}

class Actor {
  constructor(pos = new Vector(0,0), size = new Vector(1,1), speed = new Vector(0,0)) {
    if(!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
      throw new Error('Неверный тип данных');
    } else {
     this.pos = pos;
     this.size = size;
     this.speed = speed; 
    }
  }

  act() {}
    
  get left() {
    return this.pos.x; 
  }
  
  get top() {
    return this.pos.y;
  }
  
  get right() {
    return this.pos.x + this.size.x;
  }
  
  get bottom() {
    return this.pos.y + this.size.y;
  }
  
 get type() {
   return 'actor';
 }

 isIntersect(movingObject) {
   if(!(movingObject instanceof Actor)) {
     throw new Error('Неверный тип данных');
   } else if(movingObject == this) {
     return false;
   } else {
     return (movingObject.left < this.right && movingObject.right > this.left && movingObject.top < this.bottom && movingObject.bottom > this.top);
   }
 }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice(); 
    this.actors = actors.slice(); 
    this.player = this.actors.find(function(x) { return x.type === 'player'; });
    this.height = this.grid.length; 
    this.width = Math.max(0, ...this.grid.map(x => x.length));
	/*
    this.height > 0 ? Math.max.apply(Math, this.grid.map(function(elements) {
      return elements.length;
    })) : 0; 
	*/
    this.status = null;
    this.finishDelay = 1;
  }
  
  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  
  actorAt(simpleActor) {
    if(simpleActor === undefined || !(simpleActor instanceof Actor)) {
      throw new Error('Неверный тип данных или undefined');
    } else {
      return this.actors.find(elements => simpleActor.isIntersect(elements));
    }
  }
  
  obstacleAt(positionVector, sizeVector) {
    if(!(positionVector instanceof Vector) || !(sizeVector instanceof Vector)) {
      throw new Error('Неверный тип данных или undefined');
  }

  let actor = new Actor(positionVector, sizeVector);

  if (actor.bottom > this.height) {
    return 'lava';
  }

  if (actor.left < 0 || actor.top < 0 || actor.right > this.width) {
    return 'wall';
  }

  for (let i = Math.floor(actor.left); i < actor.right; i++) {
    for (let j = Math.floor(actor.top); j < actor.bottom; j++) {
      if (this.grid[j][i] !== undefined) {
        return this.grid[j][i];
      }
    }
  }
  return undefined;
  }
  
  removeActor(actor) {
    let index = this.actors.indexOf(actor);
    if(index !== -1) {
      this.actors.splice(index, 1);
    }
  }
  
  noMoreActors(type) {
    return !this.actors.some(elem => elem.type === type);
  }
  
  playerTouched(obstacle, coin) {
    if (this.status !== null) {
      return;
    } else if(obstacle === 'lava' || obstacle === 'fireball') {
      this.status = 'lost';
    } else if(obstacle === 'coin') {
      this.removeActor(coin);
      if(this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionaryObjects) { 
    this.dictionaryObjects = dictionaryObjects;
  }
  
  actorFromSymbol(symbolString) {
    if(this.dictionaryObjects !== undefined && symbolString !== undefined && symbolString in this.dictionaryObjects) { // this.dictionaryObjects !== undefined && symbolString !== undefined && symbolString in this.dictionaryObjects
      return this.dictionaryObjects[symbolString];
    } else {
      return undefined;
    }
  }
  
  obstacleFromSymbol(symbolString) {
    if(symbolString == 'x') {
      return 'wall';
    } else if(symbolString == '!') {
      return 'lava';
    } else {
      return undefined;
    }
  }
  
  createGrid(arrayStrings) {
    let arr = [];
    for(let i = 0; i < arrayStrings.length; i++) {
      let outArr = [];
      for(let j = 0; j < arrayStrings[i].length; j++) {
        outArr.push(this.obstacleFromSymbol(arrayStrings[i].charAt(j))); 
      }
      arr.push(outArr);
    }
    return arr;
  }
  
  createActors(arr) {
    let actors = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr[i].length; j++) {
        let actor = this.actorFromSymbol(arr[i].charAt(j));
        if (actor !== undefined && typeof actor === 'function') {
          let instance = new actor(new Vector(j, i));
          if (instance instanceof Actor) {
            actors.push(instance);
          }
        }
      }
    }
    return actors;
  }

  parse(arr) {
   return new Level(this.createGrid(arr), this.createActors(arr));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0,0), speed = new Vector(0,0)) {
    super(pos, new Vector(1,1), speed);
  }
  
  get type() {
    return 'fireball';
  }
  
  getNextPosition(time = 1) { 
    return this.pos.plus(this.speed.times(time));
  }
  
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  
  act(time, playingField) { 
    let nextPosition = this.getNextPosition(time);
    if(playingField.obstacleAt(nextPosition, this.size) !== undefined && playingField.obstacleAt(nextPosition, this.size) !== false) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(2,0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos, new Vector(0, 3));
    this.initialPos = this.pos;
  }

  handleObstacle() {
    this.pos = this.initialPos;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.initialPos = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    return this.initialPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then(schemas => runGame(JSON.parse(schemas), parser, DOMDisplay))
    .then(() => alert('Вы выиграли приз!'))
    .catch(err => alert(err));














