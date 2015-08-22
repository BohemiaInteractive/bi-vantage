"use strict";

var Vantage = require("../");
var commands = require('./util/server')
  , util = require("./util/util")
  ; require("assert")
  ; require("should")
  ;

var vantage = new Vantage()
  , _all = ""
  , _stdout = ""
  , _excess = ""
  ;

var onStdout = function(str) {
  _stdout += str;
  _all += str;
  return "";
};

var stdout = function() {
  var out = _stdout;
  _stdout = "";
  return String(out || "");
};

describe("integration tests:", function() {

  describe("vantage", function() {

    it("should overwrite duplicate commands", function(done){
      var arr = ["a", "b", "c"];
      arr.forEach(function(item){
        vantage
          .command("overwritten", "This command gets overwritten.")
          .action(function(args, cb){
            cb(void 0, item);
          });
        vantage
          .command("overwrite me")
          .action(function(args, cb){
            cb(void 0, item);
          });
      });

      vantage.exec("overwritten", function(err, data){
        (err === undefined).should.be.true;
        data.should.equal("c");
        vantage.exec("overwrite me", function(err, data){
          (err === undefined).should.be.true;
          data.should.equal("c");
          done();
        });
      });
    });

    it("should register and execute aliases", function(done){
      vantage
        .command("i go by other names", "This command has many aliases.")
        .alias("donald trump")
        .alias("sinterclaus")
        .alias("linus torvalds")
        .alias("nan nan nan nan nan nan nan watman!")
        .action(function(args, cb){
          cb(void 0, "You have found me.");
        });

        var ctr = 0;
        var arr = ["donald trump", "sinterclaus", "linus torvalds", "nan nan nan nan nan nan nan watman!"];
        function go() {
          if (arr[ctr]) {
            vantage.exec(arr[ctr], function(err, data){
              (err === undefined).should.be.true;
              data.should.equal("You have found me.");
              ctr++;
              if (!arr[ctr]) {
                done();
              } else {
                go();
              }
            });
          }
        }
        go();
    });
  });

  describe("vantage 2", function() {

    before("preparation", function(){
      vantage.pipe(onStdout).use(commands);
    });

    afterEach(function(){
      _excess += stdout();
    });

    var exec = function(cmd, done, cb) {
      vantage.exec(cmd).then(function(data){
        cb(void 0, data);
      }).catch(function(err){
        console.log(err);
        done(err);
      });
    };

    describe("promise execution", function() {

      it("should not fail", function(done) {
        vantage.exec("fail me not").then(function(){
          true.should.be.true; done();
        }).catch(function(err) {
          console.log(stdout());
          console.log('b', err.stack)
          true.should.not.be.true; done(err);
        });
      });

      it("should fail", function(done) {
        vantage.exec("fail me yes").then(function(){
          true.should.not.be.true; done();
        }).catch(function() {
          true.should.be.true; done();
        });
      });

    });

    describe("command execution", function(){

      it("should execute a simple command", function(done) {
        exec("fuzzy", done, function(err) {
          stdout().should.equal("wuzzy");
          done(err);
        });
      });

      it("should execute help", function(done) {
        exec("help", done, function(err) {
          String(stdout()).toLowerCase().should.containEql("help");
          done(err);
        });
      });

      it("should chain two async commands", function(done) {
        vantage.exec("foo").then(function() {
          stdout().should.equal("bar");
          return vantage.exec("fuzzy");
        }).then(function() {
          stdout().should.equal("wuzzy");
          done();
        }).catch(function(err){
          (err === undefined).should.be.true;
          done(err);
        });
      });

      it("should execute a two-word-deep command", function(done) {
        exec("deep command arg", done, function(err) {
          stdout().should.equal("arg");
          done(err);
        });
      });

      it("should execute a three-word-deep command", function(done) {
        exec("very deep command arg", done, function(err) {
          stdout().should.equal("arg");
          done(err);
        });
      });

      it("should execute a long command with arguments", function(done) {
        exec("very complicated deep command abc123 -rad -sleep 'well' -t -i 'j' ", done, function() {
          stdout().should.equal("radtjabc123");
          done();
        });
      });

      it("should execute 50 async commands in sync", function(done) {
        this.timeout(4000);
        var dones = 0, result = "", should = "", total = 50;
        var handler = function() {
          dones++;
          if (dones === (total - 1)) {
            result.should.equal(should);
            done();
          }
        };
        var hnFn = function() {
          result = result + stdout();
          handler();
        };
        var cFn = function(err){
            done(err);
        };
        for (var i = 1; i < total; ++i) {
          should = should + i;
          vantage.exec("count " + i).then(hnFn).catch(cFn);
        }
      });
    });

    describe("command validation", function() {

      it("should execute a command when not passed an optional variable", function(done) {
        exec("optional", done, function() {
          stdout().should.equal("");
          done();
        });
      });

      it("should understand --no-xxx options", function(done) {
        exec("i want --no-cheese", done, function() {
          stdout().should.equal("false");
          done();
        });
      });

      it("should ignore variadic arguments when not warranted", function(done) {
        exec("required something with extra something", done, function(err, data) {
          data.arg.should.equal("something");
          done();
        });
      });

      it("should receive variadic arguments as array", function(done) {
        exec("variadic pepperoni olives pineapple anchovies", done, function(err, data) {
          data.pizza.should.equal("pepperoni");
          data.ingredients[0].should.equal("olives");
          data.ingredients[1].should.equal("pineapple");
          data.ingredients[2].should.equal("anchovies");
          done();
        });
      });

      it("should accept variadic args as the first arg", function(done) {
        exec("variadic-pizza olives pineapple anchovies", done, function(err, data) {
          data.ingredients[0].should.equal("olives");
          data.ingredients[1].should.equal("pineapple");
          data.ingredients[2].should.equal("anchovies");
          done();
        });
      });

      it("should accept a lot of arguments", function(done) {
        exec("cmd that has a ton of arguments", done, function(err, data) {
          data.with.should.equal('that');
          data.one.should.equal('has');
          data.million.should.equal('a');
          data.arguments.should.equal('ton');
          data.in.should.equal('of');
          data.it.should.equal('arguments');
          done();
        });
      });

      it("should show help when not passed a required variable", function(done) {
        exec("required", done, function(err, data) {
          (stdout().indexOf("Missing required argument") > -1).should.equal(true);
          done();
        });
      });

      it("should should execute a command when passed a required variable", function(done) {
        exec("required foobar", done, function() {
          stdout().should.equal("foobar");
          done();
        });
      });

      it("should show help when passed an invalid command", function(done) {
        exec("gooblediguck", done, function(err, data) {
          (stdout().indexOf("Invalid Command. Showing Help:") > -1).should.equal(true);
          done();
        });
      });

      it("should show subcommand help on invalid subcommand", function(done) {
        exec("very complicated", done, function() {
          stdout().should.containEql("very complicated deep *");
          done();
        });
      });

    });

    describe("mode", function() {

      it("should enter REPL mode", function(done){
        vantage.exec("repl").then(function() {
          stdout().should.containEql("Entering REPL Mode");
          done();
        }).catch(function(err){ done(err); });
      });

      it("should execute arbitrary JS", function(done){
        vantage.exec("3*9").then(function(data) {
          (parseFloat(data) || "").should.equal(27);
          parseFloat(stdout()).should.equal(27);
          done();
        }).catch(function(err){
          done(err);
        });
      });

      it("should exit REPL mode properly", function(done){
        vantage.exec("exit").then(function() {
          stdout();
          return vantage.exec("help");
        }).then(function() {
          stdout().should.containEql("exit");
          done();
        }).catch(function(err){ done(err); });
      });

    });

  });
});
