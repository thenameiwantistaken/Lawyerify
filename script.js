var message = "Sorry! This site can only retrieve a certain number of synonyms per day due to the thesaurus used."
  + " No more words can be lawyerified today. If you reload the page tomorrow it will probably work again" + 
  + "(except if you come too late and the daily # of allowed calls is exceeded again)."; //shown after max API calls daily
var setWords = {}; //common words the algorithm below shouldn't replace because it does a bad job.
setWords["he"] = "he"; setWords["He"] = "He"; setWords["a"] = "a"; setWords["A"] = "A"; setWords["is"] = "is"; setWords["Is"] = "Is";
var text = "";
var button = document.querySelector("#lawyerify");
var strictMode = true; //Whether a word with multiple parts of speech should be replaced or not. True means it shouldn't.
var wordsLeft = 0; //tracks the # of words that should be processed before the text in the textArea is changed.
button.addEventListener("click", function(event) {
  button.disabled = true;
  text = tinyMCE.get("area").getContent({format: "text"});
  var wordRegex = /\b[a-z]+'?[a-z]*\b/gi; 
  var matches = text.match(wordRegex);
  wordsLeft = matches.length;
  matches.forEach(function(word,i) {
    if (word.includes("\'")) {
      wordsLeft--;
      return;
    }
    var url = "https://words.bighugelabs.com/api/2/d114c68208c8b398bc59a8963d564320/" + word + "/json";
    var req = new XMLHttpRequest();
    req.open("GET",url, true);
    req.addEventListener("load", function(event) {
      if (req.status == 200) {
          process(JSON.parse(req.responseText), word);
      } else if (req.status == 404) { //word not found
        wordsLeft--;
        if (wordsLeft == 0) {
          tinyMCE.get("area").setContent(text, {format:"text"});
          button.disabled = false;
        }
        return; 
      } else if (req.status == 500) { //no more API calls allowed for the day
          tinyMCE.get("area").setContent(text + "\n\n\n " + message, {format:"text"});
          alert(message);
          //note that lawyerify button will be disabled unless the page is reloaded. 
          //Then another API call will be made, and if more are allowed the site will continue to work.
     }
    });
    req.send();
  });
});
//Note: because this is being called by the API (JSONP format), it needs to be global function.
  function process(result, word) {
    var PoS = []; //contains each part of speech for the current word.
    for ( var prop in result) {
      if (prop == "noun") {
        PoS.push("noun")
      } else if (prop == "verb") {
        PoS.push("verb");
      } else if (prop == "adjective") {
        PoS.push("adjective");
      } else if (prop == "adverb") {
        PoS.push("adverb");
      }
   }
   if (PoS.length > 1 && strictMode) {
     wordsLeft--;
     if (wordsLeft == 0) {
       tinyMCE.get("area").setContent(text, {format:"text"});
       button.disabled = false;
     }
     return; //don't do anything w/ more than one possible PoS in strict mode
   }
   var longest = word;
   PoS.forEach(function(pos) {
     var str = processPoS(pos);
     if (str.length > longest.length) longest = str;
   });

   if (setWords.hasOwnProperty(word)) longest = setWords[word]; //if the word is a prop of setWords, assign value from there.
   var upper = capitalize(word);
   var lower = decapitalize(word);
   var replaced = new RegExp("\\b" + upper + "\\b", "g");
   text = text.replace(replaced, capitalize(longest));
   replaced = new RegExp("\\b" + lower + ""\\b", "g");
   text = text.replace(replaced, decapitalize(longest));
   //Note that if one word is replaced by a synonym that was elsewhere in the text
   //and that word is also being lawyerified, an error may occur where after the first word is lawyerified
   //it is lawyerified again. Ex: Say the words sad and unhappy appear in the original text
   //sad's longest synonym is unhappy but unhappy's longest synonym is despondent. 
   //Sad may replaced by unhappy and then that may replaced by despondent. 
   //This happening is so incredibly rare (note also that for some reason sad's longest synonym couldn't be despondent for the error)
   //that I do not mind it appearing in the code of this insignificant program.
   
   wordsLeft--;
   if (wordsLeft == 0) {
      tinyMCE.get("area").setContent(text, {format:"text"});
      button.disabled = false;  
    }
  function processPoS(pos) { //processes synonyms for one part of speech. Returns longest
    var synonyms = result[pos]["syn"]; //this is an array of synonyms.
    var mostCharacters = word; //access word from outside scope
    synonyms.forEach(function(syn) {
      if (syn.length > mostCharacters.length) mostCharacters = syn;   
    });
    return mostCharacters;
  }
   function capitalize(word) {
       return word.charAt(0).toUpperCase() + word.slice(1);
   }
   function decapitalize(word) {
       return word.charAt(0).toLowerCase() + word.slice(1);
   }
  }
  
  var checkbox = document.querySelector("#strictMode"); 
  checkbox.title = "If this box is not checked, when you click lawyerify and a word is encountered that can be more than one "  
    + "part of speech, the longest synonym will replace it anyway. Otherwise, it will not be replaced at all." 
    + " For example, the word date is a noun that refers to a food and also a verb that refers to dating someone."
    + " With strict mode, it won't be replaced. Without strict mode, it might be replaced by a word synonymous with either meaning.";
  checkbox.addEventListener("change", function(event) {
    strictMode = checkbox.checked;
  });
  