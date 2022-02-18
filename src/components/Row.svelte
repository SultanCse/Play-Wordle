<script>
    export let background = "";
    export let letters;
    export let id;
    import { flip } from 'svelte/animate';
</script>

{#if letters}
  <div class="row w-50 mb-1 row-cols-5 gx-2">
    {#each letters as letter, index}
      <div class="col my-1">
        <div
          class="border {id == index
            ? background
            : ''} rounded w-100 d-flex justify-content-center"
        >
          {letter}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  @media (max-width: 300px) {
    .w-50 {
      width: 80% !important;
    }
  }
</style>
