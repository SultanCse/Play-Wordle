<script>
	import Rules from './Rules.svelte';
	import Toggle from './../elements/Toggle.svelte';
	import WordleModal from './../elements/WordleModal.svelte';
	import {possibilities,charSet,falseArray} from '../store/WordleWords.js';
  import {rowColorFilter} from './services.js';
  
  let openModal = false;
  let title = '';
  let subtitle = '';
  let index = Math.floor(Math.random() * possibilities.length);
  let word = "";
  let keyColors = [];
  let rightWord = possibilities[index].toUpperCase();
  console.log(rightWord);
  let nextCount = 5;
  let lightTheme = false;
  let modalName = "";
  const keyboardHandeler = (event)=>{
    if(word.length<nextCount && word.length<30 && event.keyCode>=65 && event.keyCode<=90 && !word.includes(rightWord)){
      word = word + event.key.toUpperCase()

    }
    if(word.length != 0 && word.length % 5 == 0 && event.key == 'Enter'){
      if(possibilities.includes(word.substring(word.length-5,word.length).toLowerCase())){
        checkWord();
        nextCount = word.length + 5;
      }else{
        openModal = true;
        title = 'Attention';
        subtitle = 'Enter a Meaningfull Word';
      } 
    }
    if(event.key=='Backspace' && nextCount-5 != word.length){
      word = word.substring(0, word.length-1);
    }
  }
  const onScreenKbHandeller = (b)=> {
    if(word.length<nextCount && word.length<30 && b!='bks' && b!='reset' && b!='Enter' && !word.includes(rightWord)){
      word = word + b;
    }
    if(word.length != 0 && word.length % 5 == 0 && b=='Enter'){
      if(possibilities.includes(word.substring(word.length-5,word.length).toLowerCase())){
        checkWord();
        nextCount = word.length + 5;
      }else{
        openModal = true;
        title = 'Attention';
        subtitle = 'Enter a Meaningfull Word';
      }      
    }
    if(b=='bks' && nextCount-5 != word.length){
      word = word.substring(0, word.length-1);
    }
    if(b=='reset' ){
      word = '';
      nextCount = 5;
      colors = [];
      keyColors = [];
      firstRowColors = [];
      secondRowColors = [];
      thirdRowColors = [];
      index = Math.floor(Math.random() * possibilities.length);
      rightWord = possibilities[index].toUpperCase();
      console.log(rightWord);
      
    }
  }
  let colors=[];
  const checkWord = ()=>{
    colors = [];
    keyColors = [];   
      for(let i = 0; i<word.length; i++){
        if(rightWord[i%5] == word[i]){
          colors.push('#538D4C');
          keyColors.push({char: word[i], color: '#538D4C'})
        }else if(rightWord.includes(word[i]) ){
          colors.push(' #B4A037');
          keyColors.push({char: word[i], color: ' #B4A037'})
        }else{
          colors.push('#3A3A3C');
          keyColors.push({char: word[i], color: '#3A3A3C'})
        }
      }
      colors = colors;
      keyColorPerRow();   
    if(word.includes(rightWord)){
      openModal = true;
      title = 'Congratulations';
      subtitle = 'You have guessed the word successfully';
    }
    if(!word.includes(rightWord) && word.length == 30){
      openModal = true;
      title = 'Failed';
      subtitle = 'You have failed to guess the word';
    }
     
  }

  let firstRowColors = [];
  let secondRowColors = [];
  let thirdRowColors = [];
  const keyColorPerRow = () => {
    firstRowColors = [];
    secondRowColors = [];
    thirdRowColors = [];
    for(let i=0; i<word.length; i++){
      if(charSet[0].includes(keyColors[i].char)){
        firstRowColors.push({char: keyColors[i].char, color: keyColors[i].color})
      }else if(charSet[1].includes(keyColors[i].char)){
        secondRowColors.push({char: keyColors[i].char, color: keyColors[i].color})
      }else{
        thirdRowColors.push({char: keyColors[i].char, color: keyColors[i].color})
      }
    }
    rowColorFilter(firstRowColors);
    rowColorFilter(secondRowColors);
    rowColorFilter(thirdRowColors);
  }
  const colorReturn = (item,row)=>{
    for(let i =0; i<row.length; i++){
      if(row[i].char == item){
        return row[i].color;
      }
    }
  }
  const themeToggle = ()=>{
    openModal = true;
    modalName = "settings";
    title="";
    subtitle="Switch Mood";
  }

  const gameRules = ()=>{
    openModal = true;
    modalName = "rules";
    title="";
    subtitle="How to Play?";

  }


</script>

<svelte:window on:keydown={event => keyboardHandeler(event)} />
<div
  class="position-relative w-100 h-100 border fw-bolder"
  style="background: {lightTheme
    ? 'var(--light-BackGround)'
    : 'var(--dark-BackGround)'};
    color: {lightTheme ? 'var(--light-text)' : 'var(--dark-text)'};"
>
  <div class="middle d-flex justify-content-center">
    <div>
      <div class="d-flex ">
        <i
          class="fa-solid fa-circle-question pe-5 pt-3"
          on:click={() => gameRules()}
        />
        <span class="fw-bold fs-3">WORDLE</span>
        <i class="fa-solid fa-gear ps-5 pt-3" on:click={() => themeToggle()} />
        <!-- <div class="end"><Toggle width="30px" className="ps-5 pt-3" /></div> -->
      </div>
      <hr
        class="p-0 m-0 {lightTheme
          ? 'bg-black'
          : 'bg-white'} h-10 position-relative bottom-1 mx-2"
      />
    </div>
  </div>

  <div class="w-25 mt-2 position-absolute left-50">
    <div class="row mb-1 row-cols-5 gx-2">
      {#each word as item, i}
        <div class="col my-1">
          <div
            class="border rounded h-2 w-100 d-flex justify-content-center"
            style="background-color: {colors[i]};"
          >
            {item}
          </div>
        </div>
      {/each}
    </div>
  </div>
  <div class="w-25 mt-2 position-absolute left-50">
    <div class="row mb-1 row-cols-5 gx-2">
      {#each falseArray as item}
        <div class="col my-1">
          <div class="border rounded h-2 w-100 d-flex justify-content-center" />
        </div>
        <div class="col my-1">
          <div class="border rounded h-2 w-100 d-flex justify-content-center" />
        </div>
        <div class="col my-1">
          <div
            class="  border rounded h-2 w-100 d-flex justify-content-center"
          />
        </div>
        <div class="col my-1">
          <div
            class="  border rounded h-2 w-100 d-flex justify-content-center"
          />
        </div>
        <div class="col my-1">
          <div
            class="  border rounded h-2 w-100 d-flex justify-content-center"
          />
        </div>
      {/each}
    </div>
  </div>
  <!-- bottom div -->
  <div class="w-50 mt-2 position-absolute left-50 bottom-0">
    <!-- row1 -->
    <div class="row mb-1 row-cols-10 gx-2">
      {#each charSet[0] as item, i (i)}
        <div class="col my-1 c-p" on:click={() => onScreenKbHandeller(item)}>
          {#key firstRowColors}
            <div
              class="  border rounded h-2 w-100 d-flex justify-content-center"
              style="background-color: {colorReturn(item, firstRowColors)
                ? colorReturn(item, firstRowColors)
                : '#828385'};"
            >
              {item}
            </div>
          {/key}
        </div>
      {/each}
    </div>
    <!-- row2 -->
    <div class="row mb-1 mx-4 row-cols-9 gx-2">
      {#each charSet[1] as item, i (i)}
        <div class="col my-1 c-p" on:click={() => onScreenKbHandeller(item)}>
          {#key secondRowColors}
            <div
              class="  border rounded h-2 w-100 d-flex justify-content-center"
              style="background-color: {colorReturn(item, secondRowColors)
                ? colorReturn(item, secondRowColors)
                : '#828385'};"
            >
              {item}
            </div>
          {/key}
        </div>
      {/each}
    </div>
    <!-- row3 -->
    <div class="row mb-1 row-cols-10 gx-2">
      {#each charSet[2] as item, i (i)}
        <div class="col my-1 c-p" on:click={() => onScreenKbHandeller(item)}>
          {#key thirdRowColors}
            <div
              class="  border rounded h-2 w-100 d-flex justify-content-center"
              style="background-color: {colorReturn(item, thirdRowColors)
                ? colorReturn(item, thirdRowColors)
                : '#828385'};"
            >
              {item}
            </div>
          {/key}
        </div>
      {/each}
      <div class="col my-1 c-p" on:click={() => onScreenKbHandeller('bks')}>
        <div class="  border rounded h-2 w-100 d-flex justify-content-center">
          <i class="fas fa-backspace icon" />
        </div>
      </div>
    </div>
  </div>
  {#if openModal && !modalName}
    <WordleModal
      bind:openModal
      bind:title
      bind:subtitle
      titleColor={title == 'Congratulations' ? 'text-success' : 'text-danger'}
      backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}
    >
      {#if title == 'Failed'}
        <p class="text-success">“{rightWord}”</p>
        <p class="text-success fw-normal">is the rightWord</p>
      {:else if title == 'Congratulations'}
        <p class="text-success">“{rightWord}”</p>
        <p class="text-success fw-normal">is the rightWord</p>
      {/if}
    </WordleModal>
  {/if}
  {#if openModal && modalName == 'settings'}
    <WordleModal
      bind:openModal
      bind:title
      bind:subtitle
      bind:modalName
      backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}
    >
      <Toggle
        width="5rem"
        offColor="white"
        onColor="black"
        switchColor="white"
        swithBorderColor="red"
        bind:checkedValue={lightTheme}
      />
    </WordleModal>
  {/if}
  {#if openModal && modalName == 'rules'}
    <WordleModal
      bind:openModal
      bind:title
      bind:subtitle
      bind:modalName
      backgroundColor={lightTheme ? 'bg-info' : 'bg-black'}
    >
      <Rules />
    </WordleModal>
  {/if}
</div>

<style>
  :root {
    --positionWrong: #dfc235;
    --positionCorrect: #538d4c;
    --notIncluded: #616163;

    --dark-BackGround: #111111;
    --dark-text: white;
    --dark-border: white;
    --dark-keypad: #2d2d2d;

    --light-BackGround: #ffffff;
    --light-text: black;
    --light-border: black;
    --light-keypad: #f5f5f5;
  }
  .h-2 {
    height: 2.4rem;
    font-size: 1.4rem;
  }
  .left-50 {
    left: 50%;
    transform: translateX(-50%);
  }
  .bottom-0 {
    bottom: 0;
  }
  .bottom-1 {
    bottom: 3px;
  }
  .c-p {
    cursor: pointer;
  }
  .icon {
    font-size: 1.5rem;
    padding-top: 0.5rem;
    color: crimson;
  }
  .border {
    border: 1px solid #6e6d6d !important;
  }

  @media (max-width: 1000px) {
    .w-25 {
      width: 60% !important;
    }
    .w-50 {
      width: 96% !important;
    }
  }
  @media (max-width: 450px) {
    .w-25 {
      width: 80% !important;
    }
  }
</style>
