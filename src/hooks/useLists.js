import { useContext, useEffect } from "react";

import { useTasks } from "./useTasks";

import { Context } from "../context/GlobalContext";

import { addList, deleteListById, deleteListsByField, getListsByField, updateListById } from "../services/list.service";

export function useLists({ idBoard = null } = {}) {
  const { lists, setLists } = useContext(Context);
  const { loadTasks, deleteTasks, updateTaskList, resetTasks } = useTasks();

  useEffect(() => {
    if (idBoard) loadLists(idBoard);
    return () => {
      if (idBoard) clearLists();
    }
  }, [idBoard]);

  const loadLists = async (idBoard) => {
    try {
      const res = await getListsByField('idBoard', idBoard);
      const ids = res.map(list => list.id);
      loadTasks(ids);
      setLists(res);
    } catch (err) {
      console.error(err.message);
    }
  };

  const switchLists = async (fromIndex, toIndex) => {
    const prevState = [...lists];
    const to = lists[toIndex];
    const from = lists[fromIndex];

    if (toIndex === 0) from.position = to.position * 0.9;
    else if (toIndex === lists.length - 1) from.position = to.position * 1.1;
    else if (fromIndex < toIndex) { //Left to Right
      from.position = to.position + (lists[toIndex + 1].position - to.position) * 0.1
    } else { //Right to Left
      from.position = to.position - (to.position - lists[toIndex - 1].position) * 0.1
    }

    lists.sort((x, y) => x.position > y.position ? 1 : x.position < y.position ? -1 : 0);
    setLists(lists);

    try {
      await updateList(from.id, { position: from.position });
    } catch (err) {
      console.error(err.message);
      setLists(prevState);
    }
  };

  const createList = async ({ name, idUser, idBoard }) => {
    const prev = [...lists];
    const pos = lists.length ? lists[lists.length - 1].position + 10000 : 10000;
    const newList = { name, idUser, position: pos, idBoard };

    try {
      const tempId = Date.now().toString();
      const lastIndex = lists.length;
      setLists(prev => [...prev, { ...newList, id: tempId }]);
      const { id } = await addList(newList);

      updateTaskList(id, []);
      setLists(prev => {
        prev[lastIndex].id = id;
        return prev;
      })
    } catch (err) {
      setLists(prev);
      console.error(err.message);
    }
  }

  const updateList = async (id, data) => {
    const prevState = [...lists];
    const index = lists.findIndex((list) => list.id === id);
    const list = { ...lists[index], ...data };

    setLists(prev => {
      const lists = [...prev];
      lists[index] = list;
      return lists;
    })

    try {
      await updateListById(id, data);
    }
    catch (err) {
      setLists(prevState);
      console.error(err.message);
    }
  }

  const deleteList = async (id) => {
    const prev = [...lists];
    try {
      const index = lists.findIndex(list => list.id === id);
      lists.splice(index, 1);
      setLists([...lists]);
      await deleteListById(id);
      await deleteTasks(id);
    } catch (err) {
      setLists(prev);
      console.error(err.message);
    }
  }

  const deleteLists = async (idBoard) => {
    const prev = [...lists];
    try {
      setLists([]);
      const proms = lists.map(l => deleteTasks(l.id));
      await Promise.all(proms);
      await deleteListsByField("idBoard", idBoard);
    } catch (err) {
      setLists(prev);
      console.error(err.message);
    }
  }

  const clearLists = () => {
    setLists(null);
    resetTasks();
  }

  return { lists, loadLists, switchLists, createList, updateList, deleteList, deleteLists, clearLists }
}