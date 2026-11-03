// Stand-in for the editor canvas: same components, rendered client-side.
import doc from './doc.json';
import { Page } from './components';

export default function Canvas() {
  return <Page doc={doc} />;
}
