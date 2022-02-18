<script>
  import Row from './Row.svelte';
  let words = ['APPLE','WORRY','LIGHT'];
  let id = 0;
  let background = 'bg-primary'
</script>

<div class="text-start">
  <p>Guess the WORDLE in six tries.</p>
  <p>
    Each guess must be a valid five-letter word.Hit the enter button to submit.
  </p>
  <p>
    After each guess, the color of the tiles will change to show how close your
    guess was to the word.
  </p>
  <hr />
  Examples
  <Row letters={words[0].split('')} id={0} background={'bg-success'} />
  <p>The letter A is in the word and in the correct spot.</p>
  <Row letters={words[1].split('')} id={1} background={'bg-warning'} />
  <p>The letter O is in the word but in the wrong spot.</p>
  <Row letters={words[2].split('')} id={3} background={'bg-secondary'} />
  <p>The letter H is not in the word in any spot.</p>
</div>
